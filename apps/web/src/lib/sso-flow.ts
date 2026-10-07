import { t } from "@lingui/core/macro";
import { desktopBridge } from "./desktop";

type SsoResult = {
  data: { url?: string } | null;
  error: { message?: string; code?: string } | null;
};

/** Named Electron popups share the app session; normal browsers use Better Auth's redirect. */
export async function runSsoFlow(
  begin: (disableRedirect: boolean) => Promise<SsoResult>,
  callbackURLs: readonly string[],
): Promise<SsoResult> {
  if (!desktopBridge()) return begin(false);
  const result = await begin(true);
  if (result.error) return result;
  let target: URL;
  try {
    target = new URL(result.data?.url ?? "");
  } catch {
    throw new Error(t`Could not continue`);
  }
  if (target.protocol !== "https:" && target.origin !== window.location.origin)
    throw new Error(t`Could not continue`);
  const popup = window.open(target.href, "rakazo-sso-oauth", "popup,width=560,height=720");
  if (!popup) throw new Error(t`Could not continue`);
  const callbacks = callbackURLs.map((url) => new URL(url, window.location.href));
  await new Promise<void>((resolve, reject) => {
    const deadline = Date.now() + 5 * 60_000;
    const timer = setInterval(() => {
      if (popup.closed || Date.now() >= deadline) {
        clearInterval(timer);
        popup.close();
        reject(new Error(t`Could not continue`));
        return;
      }
      try {
        const returned = new URL(popup.location.href);
        if (
          returned.origin !== window.location.origin ||
          !callbacks.some(
            (callback) =>
              callback.origin === returned.origin && callback.pathname === returned.pathname,
          )
        )
          return;
        clearInterval(timer);
        popup.close();
        window.location.assign(returned.href);
        resolve();
      } catch {
        // The provider document is cross-origin until the API finishes its callback.
      }
    }, 250);
  });
  return result;
}
