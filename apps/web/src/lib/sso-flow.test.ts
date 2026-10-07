import { afterEach, expect, it, vi } from "vitest";
import { completeSsoCallback, runSsoFlow, SSO_CALLBACK_PATH } from "./sso-flow";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const result = { data: { url: "https://identity.example.test/authorize" }, error: null };

function desktopWindow() {
  const channels: FakeChannel[] = [];
  class FakeChannel {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    close = vi.fn();
    postMessage = vi.fn((data: unknown) => {
      for (const channel of channels) {
        if (channel !== this && channel.name === this.name) channel.onmessage?.({ data });
      }
    });
    constructor(public name: string) {
      channels.push(this);
    }
  }
  vi.stubGlobal("BroadcastChannel", FakeChannel);
  const popup = { closed: false, close: vi.fn() };
  const location = {
    href: "https://rakazo.example.test/sign-in",
    origin: "https://rakazo.example.test",
    pathname: "/sign-in",
    search: "",
    assign: vi.fn(),
  };
  const open = vi.fn(() => popup);
  const close = vi.fn();
  vi.stubGlobal("window", { rakazoDesktop: {}, location, open, close });
  const begin = vi.fn(async (_disableRedirect: boolean, callbackURL: (url: string) => string) => {
    returnTo = callbackURL("/app");
    return result;
  });
  let returnTo = "";
  const land = (url = returnTo) => {
    const target = new URL(url);
    location.pathname = target.pathname;
    location.search = target.search;
    return completeSsoCallback();
  };
  return { popup, location, open, close, begin, channels, land, callback: () => returnTo };
}

it("uses the normal redirect and unchanged callbacks on web", async () => {
  vi.stubGlobal("window", {});
  const begin = vi.fn(async (disableRedirect, callbackURL) => {
    expect(disableRedirect).toBe(false);
    expect(callbackURL("/app")).toBe("/app");
    return result;
  });
  await expect(runSsoFlow(begin, ["/app"])).resolves.toBe(result);
});

it.each(["/app", "/onboarding", "/app?settings=account", "/sign-in?error=SSO_UNAVAILABLE"])(
  "finishes desktop SSO through the landing page at %s despite a COOP-severed popup",
  async (callback) => {
    vi.useFakeTimers();
    const { popup, location, open, close, channels, land } = desktopWindow();
    popup.closed = true;
    let landing = "";
    const flow = runSsoFlow(
      async (disableRedirect, callbackURL) => {
        expect(disableRedirect).toBe(true);
        landing = callbackURL(callback.split("?error=")[0] ?? "");
        return result;
      },
      ["/app", "/onboarding", "/sign-in"],
    );
    await vi.advanceTimersByTimeAsync(30_000);
    expect(open).toHaveBeenCalledWith(result.data.url, "rakazo-sso-oauth", expect.any(String));
    expect(location.assign).not.toHaveBeenCalled();
    if (callback.includes("?error=")) landing += "&error=SSO_UNAVAILABLE";
    expect(land(landing)).toBe(true);
    await expect(flow).resolves.toBe(result);
    expect(location.assign).toHaveBeenCalledWith(`https://rakazo.example.test${callback}`);
    expect(close).toHaveBeenCalled();
    expect(popup.close).toHaveBeenCalled();
    expect(channels[0]?.close).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  },
);

it("ignores spoofed messages, mismatched nonces, foreign URLs and unrelated paths", async () => {
  vi.useFakeTimers();
  const { begin, channels, callback, land, location } = desktopWindow();
  const flow = runSsoFlow(begin, ["/app"]);
  await vi.advanceTimersByTimeAsync(0);
  const nonce = new URL(callback()).searchParams.get("nonce");
  for (const data of [
    null,
    {},
    { type: "mcp-oauth-complete", nonce },
    { type: "sso-complete", nonce: "another-attempt", url: "https://rakazo.example.test/app" },
    { type: "sso-complete", nonce, url: "https://other.example.test/app" },
    { type: "sso-complete", nonce, url: "https://rakazo.example.test/unrelated" },
    { type: "sso-complete", nonce, url: "invalid" },
  ])
    channels[0]?.onmessage?.({ data });
  const wrongAttempt = new URL(callback());
  wrongAttempt.searchParams.set("nonce", "another-attempt");
  land(wrongAttempt.href);
  expect(location.assign).not.toHaveBeenCalled();
  land();
  await flow;
});

it("reports real cancellation after the completion grace period and cleans up", async () => {
  vi.useFakeTimers();
  const { popup, begin, channels } = desktopWindow();
  const flow = runSsoFlow(begin, ["/app"]);
  const failure = expect(flow).rejects.toThrow("Could not continue");
  await vi.advanceTimersByTimeAsync(250);
  popup.closed = true;
  await vi.advanceTimersByTimeAsync(5 * 60_000);
  await failure;
  expect(channels[0]?.close).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it("bounds abandoned desktop SSO attempts", async () => {
  vi.useFakeTimers();
  const { popup, begin } = desktopWindow();
  const failure = expect(runSsoFlow(begin, ["/app"])).rejects.toThrow("Could not continue");
  await vi.advanceTimersByTimeAsync(5 * 60_000 + 250);
  await failure;
  expect(popup.close).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it("does not open a popup on server errors or unsafe provider URLs", async () => {
  const { open, channels } = desktopWindow();
  const failure = { data: null, error: { code: "SSO_UNAVAILABLE" } };
  await expect(runSsoFlow(async () => failure, ["/app"])).resolves.toBe(failure);
  await expect(
    runSsoFlow(
      async () => ({ data: { url: "http://identity.example.test" }, error: null }),
      ["/app"],
    ),
  ).rejects.toThrow();
  await expect(
    runSsoFlow(async () => {
      throw new Error("unavailable");
    }, ["/app"]),
  ).rejects.toThrow();
  expect(open).not.toHaveBeenCalled();
  expect(channels.every((channel) => channel.close.mock.calls.length === 1)).toBe(true);
});

it("reports a blocked popup and closes the channel", async () => {
  const { open, begin, channels } = desktopWindow();
  open.mockReturnValue(null as never);
  await expect(runSsoFlow(begin, ["/app"])).rejects.toThrow("Could not continue");
  expect(channels[0]?.close).toHaveBeenCalled();
});

it("only broadcasts well-formed same-origin callback landings", () => {
  const { land, channels } = desktopWindow();
  expect(completeSsoCallback()).toBe(false);
  for (const query of [
    "",
    "?nonce=attempt",
    "?nonce=attempt&returnTo=invalid",
    "?nonce=attempt&returnTo=https://other.example.test/app",
    `?nonce=attempt&returnTo=https://rakazo.example.test${SSO_CALLBACK_PATH}`,
  ]) {
    expect(land(`https://rakazo.example.test${SSO_CALLBACK_PATH}${query}`)).toBe(true);
  }
  expect(channels).toHaveLength(0);
});
