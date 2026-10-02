export type ModelPreflightOutcome =
  | "success"
  | "timeout"
  | "rate_limit"
  | "unauthorized"
  | "unavailable_model"
  | "unreachable"
  | "needs_sign_in"
  | "missing_fields"
  | "unknown";

export type ModelPreflightFailure = {
  outcome: ModelPreflightOutcome;
  message: string;
  nextAction: string;
};

export type StoredModelAuthKind = "api_key" | "oauth" | "openai_compatible";

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[a-zA-Z0-9_-]{8,}\b/g,
  /\bBearer\s+[a-zA-Z0-9._-]+\b/gi,
  /\bapi[_-]?key[=:]\s*\S+/gi,
];

/** Strip patterns that look like credentials from user-visible errors. */
export function sanitizeModelConnectionError(raw: string): string {
  let text = raw.trim();
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "•••");
  }
  return text;
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) return sanitizeModelConnectionError(error.message);
  return sanitizeModelConnectionError(String(error));
}

export function classifyModelConnectionFailure(
  error: unknown,
  context: { modelId?: string; discoveredModels?: string[] } = {},
): ModelPreflightFailure {
  const message = messageFromError(error);
  const lower = message.toLowerCase();

  if (context.modelId && context.discoveredModels && context.discoveredModels.length > 0) {
    if (!context.discoveredModels.includes(context.modelId.trim())) {
      return {
        outcome: "unavailable_model",
        message: sanitizeModelConnectionError(`Model "${context.modelId.trim()}" was not listed.`),
        nextAction: "Pick a model from the list or enter a model id served by this endpoint.",
      };
    }
  }

  if (lower.includes("timed out") || lower.includes("timeout") || lower.includes("abort")) {
    return {
      outcome: "timeout",
      message: message || "The connection timed out.",
      nextAction: "Check the server URL and network, then test again.",
    };
  }

  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("rate-limit")) {
    return {
      outcome: "rate_limit",
      message: message || "The provider is rate-limiting requests.",
      nextAction: "Wait a moment and test again.",
    };
  }

  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid api key") ||
    lower.includes("authentication")
  ) {
    return {
      outcome: "unauthorized",
      message: message || "Authentication failed.",
      nextAction: "Check the API key or sign-in, then test again.",
    };
  }

  if (
    lower.includes("econnrefused") ||
    lower.includes("connection refused") ||
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("enotfound") ||
    lower.includes("could not reach")
  ) {
    return {
      outcome: "unreachable",
      message: message || "Could not reach the model server.",
      nextAction: "Confirm the URL is reachable from this browser session, then test again.",
    };
  }

  return {
    outcome: "unknown",
    message: message || "Connection test failed.",
    nextAction: "Review provider settings and test again.",
  };
}

/** Failure when a non-empty model list omits the selected id. Empty lists stay reachable. */
export function unavailableSelectedModel(
  modelId: string | undefined,
  discoveredModels: string[],
): ModelPreflightFailure | null {
  const trimmed = modelId?.trim() ?? "";
  if (!trimmed || discoveredModels.length === 0 || discoveredModels.includes(trimmed)) return null;
  return classifyModelConnectionFailure(new Error("model not listed"), {
    modelId: trimmed,
    discoveredModels,
  });
}

/** Separate a failed credential lookup from an empty list or an unreadable secret. */
export async function loadStoredModelAuth(
  provider: string,
  listCredentials: () => Promise<
    ReadonlyArray<{ provider: string; authKind?: StoredModelAuthKind }>
  >,
): Promise<{
  storedAuthKind: StoredModelAuthKind | null;
  credentialLookupFailed: boolean;
  credentialUnreadable: boolean;
}> {
  try {
    const credentials = await listCredentials();
    const match = credentials.find((entry) => entry.provider === provider);
    return {
      storedAuthKind: match?.authKind ?? null,
      credentialLookupFailed: false,
      credentialUnreadable: Boolean(match && match.authKind === undefined),
    };
  } catch {
    return {
      storedAuthKind: null,
      credentialLookupFailed: true,
      credentialUnreadable: false,
    };
  }
}

export type ModelConnectionPreflightInput = {
  authKind: "openai-compatible" | "api-key" | "oauth";
  provider: string;
  baseUrl?: string;
  apiKey?: string;
  modelId?: string;
  /** Kind of the stored credential, when a lookup succeeded and the secret was readable. */
  storedAuthKind?: StoredModelAuthKind | null;
  credentialLookupFailed?: boolean;
  /** A credential row exists but its kind could not be read. */
  credentialUnreadable?: boolean;
  /** Catalog entry says this provider has a pinned models-list URL. */
  catalogProbe?: boolean;
  probe?: (input: { baseUrl: string; apiKey?: string }) => Promise<{ models: string[] }>;
  probeCatalog?: (input: { provider: string; apiKey: string }) => Promise<{ models: string[] }>;
};

export async function runModelConnectionPreflight(
  input: ModelConnectionPreflightInput,
): Promise<
  | { ok: true; discoveredModels: string[]; usesModelsListOnly: true }
  | { ok: false; failure: ModelPreflightFailure }
> {
  if (input.authKind === "oauth") {
    if (input.credentialLookupFailed || input.credentialUnreadable) {
      return {
        ok: false,
        failure: {
          outcome: "unknown",
          message: "Could not check stored credentials.",
          nextAction: "Try the test again.",
        },
      };
    }
    if (input.storedAuthKind === "oauth") {
      return { ok: true, discoveredModels: [], usesModelsListOnly: true };
    }
    if (input.storedAuthKind === "api_key" || input.storedAuthKind === "openai_compatible") {
      return {
        ok: false,
        failure: {
          outcome: "needs_sign_in",
          message: "An API key is stored for this provider, not a subscription sign-in.",
          nextAction: "Sign in with the subscription, or test the API key instead.",
        },
      };
    }
    return {
      ok: false,
      failure: {
        outcome: "needs_sign_in",
        message: "This provider is not connected yet.",
        nextAction: "Finish subscription sign-in, then test again.",
      },
    };
  }

  const trimmedKey = input.apiKey?.trim() ?? "";
  const trimmedModel = input.modelId?.trim() ?? "";

  if (input.authKind === "api-key") {
    if (trimmedKey.length < 8) {
      return {
        ok: false,
        failure: {
          outcome: "missing_fields",
          message: "Enter an API key before testing.",
          nextAction: "Paste your API key, then test again.",
        },
      };
    }
    if (!input.catalogProbe || !input.probeCatalog) {
      return {
        ok: false,
        failure: {
          outcome: "unknown",
          message: "This provider cannot be tested without saving.",
          nextAction: "Use Connect to verify the key.",
        },
      };
    }
    try {
      const { models } = await input.probeCatalog({
        provider: input.provider,
        apiKey: trimmedKey,
      });
      const unavailable = unavailableSelectedModel(trimmedModel, models);
      if (unavailable) return { ok: false, failure: unavailable };
      return { ok: true, discoveredModels: models, usesModelsListOnly: true };
    } catch (error) {
      return {
        ok: false,
        failure: classifyModelConnectionFailure(error, { modelId: trimmedModel }),
      };
    }
  }

  const baseUrl = input.baseUrl?.trim() ?? "";
  if (!baseUrl || !input.probe) {
    return {
      ok: false,
      failure: {
        outcome: "missing_fields",
        message: "Enter a server URL before testing.",
        nextAction: "Paste the OpenAI-compatible base URL, then test again.",
      },
    };
  }

  try {
    const { models } = await input.probe({
      baseUrl,
      apiKey: trimmedKey || undefined,
    });
    const unavailable = unavailableSelectedModel(trimmedModel, models);
    if (unavailable) return { ok: false, failure: unavailable };
    return { ok: true, discoveredModels: models, usesModelsListOnly: true };
  } catch (error) {
    return {
      ok: false,
      failure: classifyModelConnectionFailure(error, { modelId: trimmedModel }),
    };
  }
}

export function modelPreflightSuccessMessage(modelCount: number): string {
  if (modelCount === 0) {
    return "Server reachable. No models listed — enter a model id manually.";
  }
  return `Connection OK. ${modelCount} model${modelCount === 1 ? "" : "s"} available (models list only, no chat request).`;
}
