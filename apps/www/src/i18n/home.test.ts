import { describe, expect, it } from "vitest";
import { DEMO_ROSTER } from "../demo";
import { getHomeCopy } from "./home";
import { LOCALES } from "./locales";

const SUBSCRIPTION_QUESTION =
  "Can I use my Claude Pro/Max or ChatGPT Plus/Pro subscription?";
const SUBSCRIPTION_ANSWER =
  "Yes — sign in with that subscription, or use an API key / OpenRouter / a local OpenAI-compatible server (Ollama, LM Studio, etc.). Rakazo does not pay the model bill.";

describe("homepage roster", () => {
  it("keeps eight cards, with Coding Agent in the Bug Triage slot", () => {
    expect(DEMO_ROSTER).toHaveLength(8);
    expect(DEMO_ROSTER.map((bot) => bot.name)).toContain("Coding Agent");
    expect(DEMO_ROSTER.some((bot) => bot.name === "Bug Triage")).toBe(false);
    for (const locale of LOCALES) {
      const bots = getHomeCopy(locale).roster.bots;
      expect(bots).toHaveLength(8);
      expect(bots.map((bot) => bot.name)).toEqual(DEMO_ROSTER.map((bot) => bot.name));
    }
  });
});

describe("homepage models and FAQ", () => {
  it("names subscription sign-in, local servers, and This Mac in every locale", () => {
    for (const locale of LOCALES) {
      const copy = getHomeCopy(locale);
      const model = copy.selfHost.features[0]?.body ?? "";
      expect(model).toContain("Claude Pro/Max");
      expect(model).toContain("Sonnet");
      expect(model).toContain("Opus");
      expect(model).toContain("ChatGPT Plus/Pro");
      expect(model).toContain("OpenRouter");
      expect(model).toContain("Ollama");
      expect(model).toContain("LM Studio");
      expect(copy.selfHost.copy).toContain("This Mac");
      expect(copy.selfHost.copy).toContain("This computer");
      expect(copy.selfHost.copy).toContain("Mac Mini");
      expect(copy.faq.items.length).toBe(3);
    }
  });

  it("keeps the English subscription answer exact", () => {
    const faq = getHomeCopy("en").faq.items[0];
    expect(faq?.question).toBe(SUBSCRIPTION_QUESTION);
    expect(faq?.answer).toBe(SUBSCRIPTION_ANSWER);
  });
});
