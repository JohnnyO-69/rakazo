import { z } from "zod";

export const authCapabilitiesSchema = z.object({
  sso: z
    .object({
      name: z.string().min(1),
      availability: z.enum(["available", "unavailable", "checking"]),
    })
    .nullable(),
  passwordAuth: z.boolean(),
  passwordReset: z.boolean(),
  resetUrl: z.string().url().nullable(),
  billing: z.boolean().optional(),
});
export type AuthCapabilities = z.infer<typeof authCapabilitiesSchema>;

export const accountSecuritySchema = z.object({
  hasPassword: z.boolean(),
  freshOidcAuth: z.boolean(),
  ssoLinked: z.boolean(),
  emailDeletion: z.boolean(),
  sso: z.object({ name: z.string().min(1) }).nullable(),
});
export type AccountSecurity = z.infer<typeof accountSecuritySchema>;
