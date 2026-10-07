import { expect, it } from "vitest";
import { authCapabilitiesSchema } from "./auth.js";

it("requires explicit password and SSO capabilities", () => {
  expect(authCapabilitiesSchema.safeParse({ passwordReset: false, resetUrl: null }).success).toBe(
    false,
  );
  expect(
    authCapabilitiesSchema.parse({
      passwordAuth: false,
      passwordReset: false,
      resetUrl: null,
      sso: { name: "SSO", availability: "checking" },
    }).passwordAuth,
  ).toBe(false);
});
