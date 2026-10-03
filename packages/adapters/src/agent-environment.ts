import { AgentSecretInputSchema } from "@rakazo/contracts";
import { redactSecrets } from "@rakazo/core";

type EncryptedAgentSecret = {
  name: string;
  secret: { id: string; ciphertext: string };
};

type SecretLoader = {
  load(ciphertext: string, recordId: string): string;
};

export function decryptAgentEnvironment(
  rows: EncryptedAgentSecret[],
  secrets: SecretLoader,
): Record<string, string> {
  return Object.fromEntries(
    rows.map((row) => {
      AgentSecretInputSchema.shape.name.parse(row.name);
      return [row.name, secrets.load(row.secret.ciphertext, row.secret.id)];
    }),
  );
}

export function formatAgentEnvironmentInstruction(
  environment: Record<string, string>,
): string | undefined {
  const names = Object.keys(environment).sort();
  if (names.length === 0) return undefined;
  return `Managed credentials are available to shell commands as these environment variables: ${names.join(", ")}. Use them without printing, logging, or embedding their values in files or messages.`;
}

export function redactShellStreams(
  snapshot: { stdout: string; stderr: string },
  secrets: string[],
  options?: { withholdPartial?: boolean },
): { stdout: string; stderr: string } {
  const values = secrets.filter((secret) => secret.length > 0);
  let stdout = redactSecrets(snapshot.stdout, values);
  let stderr = redactSecrets(snapshot.stderr, values);
  for (let pass = 0; pass < values.length; pass++) {
    let changed = false;
    for (const secret of values) {
      const next = redactSpanningSecret(stdout, stderr, secret);
      if (next.stdout !== stdout || next.stderr !== stderr) {
        stdout = next.stdout;
        stderr = next.stderr;
        changed = true;
      }
    }
    if (!changed) break;
  }
  if (!options?.withholdPartial) return { stdout, stderr };
  return withholdSecretPrefix(stdout, stderr, values);
}

export function redactAgentCommandResult(
  result: { stdout: string; stderr: string; code: number },
  secrets: string[],
) {
  return { ...result, ...redactShellStreams(result, secrets) };
}

function redactSpanningSecret(
  stdout: string,
  stderr: string,
  secret: string,
): { stdout: string; stderr: string } {
  if (secret.length < 2 || stdout.length === 0 || stderr.length === 0) return { stdout, stderr };
  const headLen = Math.min(secret.length - 1, stdout.length);
  const tailLen = Math.min(secret.length - 1, stderr.length);
  const head = stdout.slice(stdout.length - headLen);
  const boundary = head + stderr.slice(0, tailLen);
  const index = boundary.indexOf(secret);
  if (index < 0) return { stdout, stderr };
  const start = stdout.length - headLen + index;
  const end = start + secret.length;
  if (start >= stdout.length || end <= stdout.length) return { stdout, stderr };
  return {
    stdout: `${stdout.slice(0, start)}[redacted]`,
    stderr: stderr.slice(end - stdout.length),
  };
}

/** Longest suffix of `text` that is a proper prefix of `secret`. */
function secretPrefixSuffixLength(text: string, secret: string): number {
  const max = Math.min(secret.length - 1, text.length);
  const regionStart = text.length - max;
  for (let index = regionStart; index < text.length; index++) {
    if (text.charCodeAt(index) !== secret.charCodeAt(0)) continue;
    const size = text.length - index;
    let matches = true;
    for (let offset = 1; offset < size; offset++) {
      if (text.charCodeAt(index + offset) !== secret.charCodeAt(offset)) {
        matches = false;
        break;
      }
    }
    if (matches) return size;
  }
  return 0;
}

function withholdStreamPrefix(text: string, secrets: string[]): string {
  let hold = 0;
  for (const secret of secrets) hold = Math.max(hold, secretPrefixSuffixLength(text, secret));
  if (hold === 0) return text;
  let cut = text.length - hold;
  if (cut > 0 && cut < text.length) {
    const before = text.charCodeAt(cut - 1);
    const after = text.charCodeAt(cut);
    // Keep a surrogate pair out of the published view rather than splitting it.
    if (before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff) cut -= 1;
  }
  if (cut <= 0) return "";
  return text.slice(0, cut);
}

function withholdSecretPrefix(
  stdout: string,
  stderr: string,
  secrets: string[],
): { stdout: string; stderr: string } {
  // Each stream is held on its own. A suffix of stdout+stderr stops matching once
  // stderr appends unrelated text, which would publish a prefix still sitting in stdout.
  return {
    stdout: withholdStreamPrefix(stdout, secrets),
    stderr: withholdStreamPrefix(stderr, secrets),
  };
}
