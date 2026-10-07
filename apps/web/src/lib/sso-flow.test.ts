import { afterEach, expect, it, vi } from "vitest";
import { runSsoFlow } from "./sso-flow";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const result = { data: { url: "https://identity.example.test/authorize" }, error: null };

function desktopWindow() {
  const popup = { closed: false, close: vi.fn(), location: { href: result.data.url } };
  const location = {
    href: "https://rakazo.example.test/sign-in",
    origin: "https://rakazo.example.test",
    assign: vi.fn(),
  };
  const open = vi.fn(() => popup);
  vi.stubGlobal("window", { rakazoDesktop: {}, location, open });
  return { popup, location, open };
}

it("uses the normal redirect on web", async () => {
  vi.stubGlobal("window", {});
  const begin = vi.fn(async () => result);
  await expect(runSsoFlow(begin, ["/app"])).resolves.toBe(result);
  expect(begin).toHaveBeenCalledWith(false);
});

it.each(["/app", "/onboarding", "/account", "/sign-in?error=SSO_UNAVAILABLE"])(
  "finishes desktop SSO at %s in the app session",
  async (callback) => {
    vi.useFakeTimers();
    const { popup, location, open } = desktopWindow();
    const begin = vi.fn(async () => result);
    const flow = runSsoFlow(begin, ["/app", "/onboarding", "/account", "/sign-in"]);
    await vi.advanceTimersByTimeAsync(250);
    expect(begin).toHaveBeenCalledWith(true);
    expect(open).toHaveBeenCalledWith(result.data.url, "rakazo-sso-oauth", expect.any(String));
    expect(location.assign).not.toHaveBeenCalled();
    popup.location.href = `https://rakazo.example.test${callback}`;
    await vi.advanceTimersByTimeAsync(250);
    await expect(flow).resolves.toBe(result);
    expect(popup.close).toHaveBeenCalled();
    expect(location.assign).toHaveBeenCalledWith(popup.location.href);
    expect(vi.getTimerCount()).toBe(0);
  },
);

it("ignores foreign callbacks and unrelated app paths", async () => {
  vi.useFakeTimers();
  const { popup, location } = desktopWindow();
  const flow = runSsoFlow(async () => result, ["/account"]);
  popup.location.href = "https://other.example.test/account";
  await vi.advanceTimersByTimeAsync(250);
  popup.location.href = "https://rakazo.example.test/unrelated";
  await vi.advanceTimersByTimeAsync(250);
  expect(location.assign).not.toHaveBeenCalled();
  popup.location.href = "https://rakazo.example.test/account";
  await vi.advanceTimersByTimeAsync(250);
  await flow;
});

it("reports cancellation and clears the popup timer", async () => {
  vi.useFakeTimers();
  const { popup } = desktopWindow();
  const flow = runSsoFlow(async () => result, ["/app"]);
  const failure = expect(flow).rejects.toThrow();
  popup.closed = true;
  await vi.advanceTimersByTimeAsync(250);
  await failure;
  expect(vi.getTimerCount()).toBe(0);
});

it("does not open a popup on server errors or unsafe provider URLs", async () => {
  const { open } = desktopWindow();
  const failure = { data: null, error: { code: "SSO_UNAVAILABLE" } };
  await expect(runSsoFlow(async () => failure, ["/app"])).resolves.toBe(failure);
  await expect(
    runSsoFlow(
      async () => ({ data: { url: "http://identity.example.test" }, error: null }),
      ["/app"],
    ),
  ).rejects.toThrow();
  expect(open).not.toHaveBeenCalled();
});

it("bounds abandoned desktop SSO attempts", async () => {
  vi.useFakeTimers();
  const { popup } = desktopWindow();
  const flow = runSsoFlow(async () => result, ["/app"]);
  const failure = expect(flow).rejects.toThrow("Could not continue");
  await vi.advanceTimersByTimeAsync(5 * 60_000);
  await failure;
  expect(popup.close).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
it("reports a blocked popup", async () => {
  const { open } = desktopWindow();
  open.mockReturnValue(null as never);
  await expect(runSsoFlow(async () => result, ["/app"])).rejects.toThrow("Could not continue");
});
