import { afterEach, describe, expect, it, vi } from "vitest";
import {
  catalogModelLabel,
  catalogProviderProbeBaseUrl,
  listPiCatalog,
  probeCatalogProviderModels,
  scriptedCatalogEntry,
} from "./pi-models.js";
import { probeOpenAiCompatibleModels } from "./pi-openai-compatible-provider.js";

describe("Pi model catalog", () => {
  it("keeps the custom catalog independent of server model IDs", () => {
    const custom = listPiCatalog().filter((entry) => entry.provider === "openai-compatible");
    expect(custom).toHaveLength(1);
    expect(custom[0]).toMatchObject({ id: "custom", placeholder: true, reasoning: false });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("lists real Pi providers instead of a two-option dropdown", () => {
    const catalog = listPiCatalog();
    const providers = new Set(catalog.map((entry) => entry.provider));
    expect(catalog.length).toBeGreaterThan(20);
    expect(providers.has("openrouter")).toBe(true);
    expect(providers.size).toBeGreaterThan(5);
    expect(
      catalog.some(
        (entry) => entry.auth === "oauth" || entry.auth === "both" || entry.subscription,
      ),
    ).toBe(true);
    const chatgpt = catalog.find((entry) => entry.provider === "openai-codex");
    expect(chatgpt?.signIn).toBe("device-code");
    expect(chatgpt?.billing).toMatch(/ChatGPT Plus or Pro/);
    const copilot = catalog.find((entry) => entry.provider === "github-copilot");
    expect(copilot?.signIn).toBe("device-code");
    const grok = catalog.find((entry) => entry.provider === "xai");
    expect(grok?.signIn).toBe("device-code");
    const claude = catalog.find((entry) => entry.provider === "anthropic");
    expect(claude).toMatchObject({
      signIn: "auth-url",
      authHint: "Claude Pro/Max / key",
      oauthLabel: "Sign in with Claude Pro/Max",
      billing: "",
    });
    expect(scriptedCatalogEntry.provider).toBe("scripted");
  });

  it("lists current xAI and OpenCode Go models from the Pi catalog", () => {
    const catalog = listPiCatalog();
    const ids = (provider: string) =>
      catalog.filter((entry) => entry.provider === provider).map((entry) => entry.id);
    expect(ids("xai")).toContain("grok-4.6");
    expect(ids("opencode-go")).toContain("glm-5.3");
    const grok46 = catalog.find((entry) => entry.provider === "xai" && entry.id === "grok-4.6");
    expect(grok46).toMatchObject({
      reasoning: true,
      thinkingLevels: ["low", "medium", "high", "xhigh"],
    });
    const openAiCompatible = catalog.find((entry) => entry.provider === "openai-compatible");
    expect(openAiCompatible).toMatchObject({ id: "custom", placeholder: true });
    expect(openAiCompatible?.catalogProbe).toBeUndefined();
  });

  it("pins catalog probes to registry base URLs and leaves user URLs gated", async () => {
    const openrouter = catalogProviderProbeBaseUrl("openrouter");
    expect(openrouter).toMatch(/^https:\/\/openrouter\.ai\//);
    expect(listPiCatalog().find((entry) => entry.provider === "openrouter")?.catalogProbe).toBe(
      true,
    );
    expect(catalogProviderProbeBaseUrl("openai-compatible")).toBeNull();
    expect(catalogProviderProbeBaseUrl("anthropic")).toBeNull();

    const previous = process.env.RAKAZO_OPENAI_COMPAT_ALLOW_PUBLIC;
    delete process.env.RAKAZO_OPENAI_COMPAT_ALLOW_PUBLIC;
    try {
      await expect(
        probeOpenAiCompatibleModels({ baseUrl: openrouter!, apiKey: "sk-test-key" }, async () => {
          throw new Error("user-supplied probe should be rejected before fetch");
        }),
      ).rejects.toThrow(/Public model endpoints are blocked/);

      let requestedUrl = "";
      const fetchImpl = async (input: RequestInfo | URL) => {
        requestedUrl = input instanceof Request ? input.url : String(input);
        return new Response(JSON.stringify({ object: "list", data: [{ id: "pinned-model" }] }), {
          status: 200,
        });
      };
      await expect(
        probeCatalogProviderModels(
          { provider: "openrouter", apiKey: "sk-test-key-12345678" },
          fetchImpl,
        ),
      ).resolves.toEqual(["pinned-model"]);
      expect(requestedUrl).toContain(openrouter);
    } finally {
      if (previous === undefined) delete process.env.RAKAZO_OPENAI_COMPAT_ALLOW_PUBLIC;
      else process.env.RAKAZO_OPENAI_COMPAT_ALLOW_PUBLIC = previous;
    }
  });

  it("adds a configured OpenRouter model that is newer than the static catalog", async () => {
    vi.stubEnv("PI_DEFAULT_PROVIDER", " openrouter ");
    vi.stubEnv("PI_DEFAULT_MODEL", " rakazo-test/unknown-future-model ");
    vi.resetModules();

    const { listPiCatalog: listConfiguredCatalog } = await import("./pi-models.js");
    expect(listConfiguredCatalog()[0]).toMatchObject({
      provider: "openrouter",
      id: "rakazo-test/unknown-future-model",
      label: "rakazo-test/unknown-future-model",
    });
  });

  it("normalizes a PI_DEFAULT_MODEL id that ends in -latest", async () => {
    vi.stubEnv("PI_DEFAULT_PROVIDER", "openrouter");
    vi.stubEnv("PI_DEFAULT_MODEL", "foo-latest");
    vi.resetModules();

    const { listPiCatalog: listConfiguredCatalog } = await import("./pi-models.js");
    expect(listConfiguredCatalog()[0]).toMatchObject({
      provider: "openrouter",
      id: "foo-latest",
      label: "foo (auto-updates)",
    });
  });

  it("does not advertise a synthetic model for providers the runtime cannot synthesize", async () => {
    vi.stubEnv("PI_DEFAULT_PROVIDER", "anthropic");
    vi.stubEnv("PI_DEFAULT_MODEL", "future/unknown-model");
    vi.resetModules();

    const { listPiCatalog: listConfiguredCatalog } = await import("./pi-models.js");
    expect(
      listConfiguredCatalog().some(
        (entry) => entry.provider === "anthropic" && entry.id === "future/unknown-model",
      ),
    ).toBe(false);
  });

  it('never labels an older model "latest" and keeps aliases distinct from snapshots', () => {
    const catalog = listPiCatalog();
    const label = (id: string) =>
      catalog.find((entry) => entry.provider === "anthropic" && entry.id === id)?.label;
    expect(label("claude-opus-5")).toBeDefined();
    expect(label("claude-opus-4-5")).toBe("Claude Opus 4.5 (auto-updates)");
    expect(label("claude-haiku-4-5")).toBe("Claude Haiku 4.5 (auto-updates)");
    expect(label("claude-haiku-4-5-20251001")).toBe("Claude Haiku 4.5");
  });
});

describe("catalogModelLabel", () => {
  const providerModelIds = [
    "claude-opus-4-5",
    "claude-opus-4-5-20251101",
    "mistral-medium",
    "mistral-medium-2508",
    "mistral-small",
    "mistral-small-260401",
    "foo",
    "foo-preview",
  ];

  it.each([
    // Alias: the id ends in `latest`, or a dated sibling proves the undated id floats.
    ["claude-opus-4-5", "Claude Opus 4.5 (latest)", "Claude Opus 4.5 (auto-updates)"],
    ["mistral-medium", "Mistral Medium Latest", "Mistral Medium (auto-updates)"],
    ["mistral-small", "Mistral Small Latest", "Mistral Small (auto-updates)"],
    ["gemini-flash-latest", "Gemini Flash Latest", "Gemini Flash (auto-updates)"],
    ["foo-latest", "foo-latest", "foo (auto-updates)"],
    ["foo/latest", "foo/latest", "foo (auto-updates)"],
    ["qwen-max-latest", "Qwen Max Latest (Qwen3.8 Max)", "Qwen Max (auto-updates)"],
    // Pinned: `-preview` is its own model and a dated id is already a snapshot, so promise nothing.
    ["foo", "Foo Latest", "Foo"],
    ["claude-opus-4-5-20251101", "Claude Opus 4.5 (latest)", "Claude Opus 4.5"],
    // Untouched: no marker, no name, or nothing left once the marker goes.
    ["claude-opus-5", "Claude Opus 5", "Claude Opus 5"],
    ["some-model", undefined, "some-model"],
    ["latest", "latest", "latest"],
  ])("labels %s / %s as %s", (id, name, expected) => {
    expect(catalogModelLabel(id, name, providerModelIds)).toBe(expected);
  });
});
