// @vitest-environment jsdom
import type { AccountSecurity } from "@rakazo/contracts";
import type { ComponentProps, ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchAccountSecurity } from "../lib/account-security";
import { authClient } from "../lib/auth";
import { runSsoFlow } from "../lib/sso-flow";
import { AccountAccess } from "./AccountAccess";

vi.mock("@lingui/react/macro", () => ({
  useLingui: () => ({ t: (strings: TemplateStringsArray) => strings.join("") }),
  Trans: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@rakazo/ui-web", () => ({
  Button: ({ variant: _variant, ...props }: ComponentProps<"button"> & { variant?: string }) => (
    <button {...props} />
  ),
  Input: (props: ComponentProps<"input">) => <input {...props} />,
  Label: ({ htmlFor, children, ...props }: ComponentProps<"label">) => (
    <label htmlFor={htmlFor} {...props}>
      {children}
    </label>
  ),
}));
vi.mock("../lib/account-security", () => ({
  fetchAccountSecurity: vi.fn(),
  requestAccountDeletionCode: vi.fn(),
}));
vi.mock("../lib/auth", () => ({
  authClient: { linkSocial: vi.fn(), signIn: { social: vi.fn() }, deleteUser: vi.fn() },
}));
vi.mock("../lib/sso-flow", () => ({ runSsoFlow: vi.fn(async (begin) => begin(true)) }));
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const security: AccountSecurity = {
  hasPassword: false,
  freshOidcAuth: false,
  ssoLinked: false,
  emailDeletion: false,
  sso: { name: "SSO" },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchAccountSecurity).mockResolvedValue(security);
  vi.mocked(authClient.linkSocial).mockResolvedValue({
    data: { url: "https://identity.example.test/authorize", redirect: true },
    error: null,
  });
  vi.mocked(authClient.signIn.social).mockResolvedValue({
    data: { url: "https://identity.example.test/authorize", redirect: true },
    error: null,
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render() {
  await act(async () => root.render(<AccountAccess />));
}
async function click(label: string) {
  const button = Array.from(host.querySelectorAll("button")).find(
    (button) => button.textContent === label,
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
}
it("uses the shared desktop flow for linking", async () => {
  await render();
  await click("Link SSO");
  expect(runSsoFlow).toHaveBeenCalledWith(expect.any(Function), [window.location.href]);
  expect(authClient.linkSocial).toHaveBeenCalledWith(
    expect.objectContaining({
      provider: "oidc",
      disableRedirect: true,
      callbackURL: window.location.href,
    }),
  );
});
it("uses the shared desktop flow for account-bound deletion reauthentication", async () => {
  await render();
  await click("Delete account");
  await click("Sign in again");
  expect(runSsoFlow).toHaveBeenCalledWith(expect.any(Function), [window.location.href]);
  expect(authClient.signIn.social).toHaveBeenCalledWith(
    expect.objectContaining({ disableRedirect: true, additionalData: { reauthenticate: true } }),
  );
});
it("shows the password deletion path for legacy account security", async () => {
  vi.mocked(fetchAccountSecurity).mockResolvedValue({ ...security, hasPassword: true, sso: null });
  await render();
  await click("Delete account");
  expect(host.querySelector('input[type="password"]')).not.toBeNull();
  expect(host.textContent).not.toContain("Link SSO");
  expect(host.textContent).not.toContain("Sign in again");
  expect(host.textContent).not.toContain("Send deletion code");
});
