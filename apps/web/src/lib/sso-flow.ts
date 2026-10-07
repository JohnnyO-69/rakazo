import { t } from "@lingui/core/macro";
import { desktopBridge } from "./desktop";

type SsoResult = {
  data: { url?: string } | null;
  error: { message?: string; code?: string } | null;
};

export const SSO_CALLBACK_PATH = "/sso/callback";
const SSO_CHANNEL = "rakazo-sso-oauth";
const SSO_TIMEOUT_MS = 5 * 60_000;

/** The callback runs before session routing, including failed authentication. */
export function completeSsoCallback(): boolean {
  if (window.location.pathname !== SSO_CALLBACK_PATH) return false;
  const params = new URLSearchParams(window.location.search);
  const nonce = params.get("nonce");
  const returnTo = params.get("returnTo");
  if (!nonce || !returnTo) return true;
  let target: URL;
  try {
    target = new URL(returnTo);
  } catch {
    return true;
  }
  if (target.origin !== window.location.origin || target.pathname === SSO_CALLBACK_PATH)
    return true;
  const error = params.get("error");
  if (error) target.searchParams.set("error", error);
  const channel = new BroadcastChannel(`${SSO_CHANNEL}:${nonce}`);
  channel.postMessage({
    type: error ? "sso-error" : "sso-complete",
    nonce,
    url: target.href,
  });
  channel.close();
  window.close();
  return true;
}

/** Named Electron popups share the app session; normal browsers use Better Auth's redirect. */
export async function runSsoFlow(
  begin: (disableRedirect: boolean, callbackURL: (url: string) => string) => Promise<SsoResult>,
  callbackURLs: readonly string[],
): Promise<SsoResult> {
  if (!desktopBridge()) return begin(false, (url) => url);
  const nonce = crypto.randomUUID();
  const callbacks = callbackURLs.map((url) => new URL(url, window.location.href));
  const callbackURL = (url: string) => {
    const callback = new URL(SSO_CALLBACK_PATH, window.location.origin);
    callback.searchParams.set("nonce", nonce);
    callback.searchParams.set("returnTo", new URL(url, window.location.href).href);
    return callback.href;
  };
  // Subscribe before opening the popup, as completion can arrive immediately.
  // Like MCP OAuth, this channel survives provider COOP navigation.
  const channel = new BroadcastChannel(`${SSO_CHANNEL}:${nonce}`);
  let popup: Window | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await begin(true, callbackURL);
    if (result.error) return result;
    let target: URL;
    try {
      target = new URL(result.data?.url ?? "");
    } catch {
      throw new Error(t`Could not continue`);
    }
    if (target.protocol !== "https:" && target.origin !== window.location.origin)
      throw new Error(t`Could not continue`);
    popup = window.open(target.href, SSO_CHANNEL, "popup,width=560,height=720");
    if (!popup) throw new Error(t`Could not continue`);
    await new Promise<void>((resolve, reject) => {
      channel.onmessage = (event: MessageEvent) => {
        const message: unknown = event.data;
        if (!message || typeof message !== "object") return;
        if (!("nonce" in message) || message.nonce !== nonce) return;
        if (
          !("type" in message) ||
          (message.type !== "sso-complete" && message.type !== "sso-error") ||
          !("url" in message) ||
          typeof message.url !== "string"
        )
          return;
        let returned: URL;
        try {
          returned = new URL(message.url);
        } catch {
          return;
        }
        if (
          returned.origin !== window.location.origin ||
          !callbacks.some(
            (callback) =>
              callback.origin === returned.origin && callback.pathname === returned.pathname,
          )
        )
          return;
        window.location.assign(returned.href);
        resolve();
      };
      // COOP makes closed indistinguishable from cancellation. Give both the
      // full completion budget; a closed handle is never a success signal.
      timer = setTimeout(() => {
        if (popup?.closed) {
          reject(new Error(t`Could not continue`));
          return;
        }
        timer = setTimeout(() => reject(new Error(t`Could not continue`)), 250);
      }, SSO_TIMEOUT_MS);
    });
    return result;
  } finally {
    clearTimeout(timer);
    channel.close();
    popup?.close();
  }
}
