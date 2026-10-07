import { afterEach, expect, it, vi } from "vitest";
import { fetchAuthCapabilities } from "./auth-capabilities";

afterEach(() => vi.unstubAllGlobals());
const capability = {
  passwordAuth: false,
  sso: { name: "Example", availability: "unavailable" },
  passwordReset: false,
  resetUrl: null,
};
it("validates configured SSO even during discovery downtime", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(capability)),
  );
  await expect(fetchAuthCapabilities()).resolves.toEqual(capability);
});
it.each([
  {},
  { passwordAuth: true },
  { ...capability, sso: {} },
  { ...capability, passwordAuth: "false" },
])("rejects malformed successful capabilities", async (body) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body)),
  );
  await expect(fetchAuthCapabilities()).rejects.toThrow();
});
it("rejects HTTP errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({}, { status: 503 })),
  );
  await expect(fetchAuthCapabilities()).rejects.toThrow();
});
