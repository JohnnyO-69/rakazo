import { t } from "@lingui/core/macro";
import { accountSecuritySchema } from "@rakazo/contracts";
import { readBoundedJsonResponse } from "@rakazo/core";
import { authErrorText } from "./user-error";

export async function fetchAccountSecurity() {
  const response = await fetch("/api/auth/account-security", {
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(t`Could not load sign-in options`);
  return accountSecuritySchema.parse(await readBoundedJsonResponse<unknown>(response, 64 * 1024));
}

export async function requestAccountDeletionCode() {
  const response = await fetch("/api/auth/request-account-deletion", {
    method: "POST",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok)
    throw new Error(
      authErrorText(
        await readBoundedJsonResponse<unknown>(response, 64 * 1024),
        t`Could not continue`,
      ),
    );
}
