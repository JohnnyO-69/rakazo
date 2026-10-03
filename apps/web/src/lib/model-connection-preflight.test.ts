import { describe, expect, it, vi } from "vitest";
import {
  classifyModelConnectionFailure,
  loadStoredModelAuth,
  modelPreflightSuccessMessage,
  runModelConnectionPreflight,
  sanitizeModelConnectionError,
  unavailableSelectedModel,
} from "./model-connection-preflight.js";

describe("sanitizeModelConnectionError", () => {
  it("redacts api key patterns", () => {
    expect(sanitizeModelConnectionError("Invalid sk-secretkey1234567890")).not.toContain(
      "sk-secretkey1234567890",
    );
  });
});

describe("classifyModelConnectionFailure", () => {
  it("detects rate limits and timeouts", () => {
    expect(classifyModelConnectionFailure(new Error("429 rate limit")).outcome).toBe("rate_limit");
    expect(classifyModelConnectionFailure(new Error("probe timed out")).outcome).toBe("timeout");
  });
});

describe("unavailableSelectedModel", () => {
  it("fails only when a non-empty list omits the selected id", () => {
    expect(unavailableSelectedModel("gpt-missing", ["gpt-test"])?.outcome).toBe(
      "unavailable_model",
    );
    expect(unavailableSelectedModel("gpt-test", ["gpt-test"])).toBeNull();
    expect(unavailableSelectedModel("", ["gpt-test"])).toBeNull();
    expect(unavailableSelectedModel("gpt-missing", [])).toBeNull();
  });
});

describe("loadStoredModelAuth", () => {
  it("keeps lookup failures distinct from a missing credential", async () => {
    await expect(loadStoredModelAuth("anthropic", async () => [])).resolves.toEqual({
      storedAuthKind: null,
      credentialLookupFailed: false,
      credentialUnreadable: false,
    });
    await expect(
      loadStoredModelAuth("anthropic", async () => {
        throw new Error("offline");
      }),
    ).resolves.toEqual({
      storedAuthKind: null,
      credentialLookupFailed: true,
      credentialUnreadable: false,
    });
  });

  it("reads the stored kind and flags a row whose kind is missing", async () => {
    await expect(
      loadStoredModelAuth("anthropic", async () => [
        { provider: "openai", authKind: "oauth" },
        { provider: "anthropic", authKind: "api_key" },
      ]),
    ).resolves.toMatchObject({ storedAuthKind: "api_key", credentialUnreadable: false });
    await expect(
      loadStoredModelAuth("anthropic", async () => [{ provider: "anthropic" }]),
    ).resolves.toMatchObject({ storedAuthKind: null, credentialUnreadable: true });
  });
});

describe("runModelConnectionPreflight", () => {
  it("probes catalog providers through the pinned catalog endpoint", async () => {
    const probeCatalog = vi.fn().mockResolvedValue({ models: ["gpt-test"] });
    const probe = vi.fn();
    const result = await runModelConnectionPreflight({
      authKind: "api-key",
      provider: "openrouter",
      apiKey: "sk-test-key-12345678",
      modelId: "gpt-test",
      catalogProbe: true,
      probe,
      probeCatalog,
    });
    expect(result.ok).toBe(true);
    expect(probe).not.toHaveBeenCalled();
    expect(probeCatalog).toHaveBeenCalledWith({
      provider: "openrouter",
      apiKey: "sk-test-key-12345678",
    });
  });

  it("rejects a selected model a compatible probe did not list", async () => {
    const result = await runModelConnectionPreflight({
      authKind: "openai-compatible",
      provider: "openai-compatible",
      baseUrl: "http://127.0.0.1:8000/v1",
      modelId: "missing-model",
      probe: async () => ({ models: ["listed-model"] }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.outcome).toBe("unavailable_model");
  });

  it("rejects a selected model the catalog probe did not list", async () => {
    const result = await runModelConnectionPreflight({
      authKind: "api-key",
      provider: "openrouter",
      apiKey: "sk-test-key-12345678",
      modelId: "missing-model",
      catalogProbe: true,
      probeCatalog: async () => ({ models: ["gpt-test"] }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.outcome).toBe("unavailable_model");
  });

  it("does not send catalog keys through the user-supplied URL probe", async () => {
    const result = await runModelConnectionPreflight({
      authKind: "api-key",
      provider: "anthropic",
      apiKey: "sk-test-key-12345678",
      catalogProbe: false,
      probe: vi.fn(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.message).toMatch(/cannot be tested without saving/);
  });

  it("reports oauth when not connected", async () => {
    const result = await runModelConnectionPreflight({
      authKind: "oauth",
      provider: "openai-codex",
      storedAuthKind: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.outcome).toBe("needs_sign_in");
  });

  it("does not treat a stored api key as subscription sign-in", async () => {
    const result = await runModelConnectionPreflight({
      authKind: "oauth",
      provider: "anthropic",
      storedAuthKind: "api_key",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.outcome).toBe("needs_sign_in");
      expect(result.failure.message).toMatch(/API key is stored/);
    }
  });

  it("accepts a stored subscription credential", async () => {
    const result = await runModelConnectionPreflight({
      authKind: "oauth",
      provider: "openai-codex",
      storedAuthKind: "oauth",
    });
    expect(result.ok).toBe(true);
  });

  it("does not treat an unreadable credential as a missing sign-in", async () => {
    const result = await runModelConnectionPreflight({
      authKind: "oauth",
      provider: "anthropic",
      credentialUnreadable: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.outcome).toBe("unknown");
      expect(result.failure.message).toMatch(/Could not check stored credentials/);
    }
  });

  it("keeps credential lookup failures distinct from a missing sign-in", async () => {
    const result = await runModelConnectionPreflight({
      authKind: "oauth",
      provider: "openai-codex",
      credentialLookupFailed: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.outcome).toBe("unknown");
      expect(result.failure.message).toMatch(/Could not check stored credentials/);
    }
  });
});

describe("modelPreflightSuccessMessage", () => {
  it("reports how many models the list returned", () => {
    expect(modelPreflightSuccessMessage(1)).toBe("Connection OK. 1 model available.");
    expect(modelPreflightSuccessMessage(466)).toBe("Connection OK. 466 models available.");
    expect(modelPreflightSuccessMessage(0)).toBe(
      "Server reachable. No models listed — enter a model id manually.",
    );
  });
});
