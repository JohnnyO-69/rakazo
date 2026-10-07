// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act, createElement, useEffect } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArchivedBots from "../app/archived-bots";
import type { MobileBot } from "./api";

const { rpc, alert, push } = vi.hoisted(() => ({
  rpc: vi.fn(),
  alert: vi.fn(),
  push: vi.fn(),
}));
const bot = { id: "bot-fixture", name: "Fixture" } as MobileBot;
vi.mock("./api", () => ({ rpc }));
vi.mock("expo-router", () => ({
  useRouter: () => ({ push }),
  useFocusEffect: (effect: () => (() => void) | undefined) => useEffect(effect, [effect]),
}));
vi.mock("react-native", () => ({
  Alert: { alert },
  ActivityIndicator: () => null,
  ScrollView: ({ children }: { children?: ReactNode }) => createElement("div", null, children),
  Text: ({ children }: { children?: ReactNode }) => createElement("span", null, children),
}));
vi.mock("./native", () => ({ useMobileTokens: () => ({}) }));
vi.mock("./i18n", () => {
  const t = (text: string) => text;
  return { t, useI18n: () => ({ t }) };
});
vi.mock("../components/archived-bot-list", () => ({
  ArchivedBotList: ({
    bots,
    onOpen,
    onRestore,
  }: {
    bots: MobileBot[];
    onOpen: (bot: MobileBot) => void;
    onRestore: (bot: MobileBot) => void;
  }) =>
    createElement(
      "div",
      null,
      ...bots.map((item) =>
        createElement(
          "div",
          { key: item.id },
          createElement("button", { type: "button", onClick: () => onOpen(item) }, item.name),
          createElement("button", { type: "button", onClick: () => onRestore(item) }, "Restore"),
        ),
      ),
    ),
}));

describe("archived chat read failures", () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    rpc.mockResolvedValue([bot]);
    container = document.createElement("div");
    root = createRoot(container);
    await act(async () => root.render(<ArchivedBots />));
  });
  afterEach(() => {
    act(() => root.unmount());
    vi.unstubAllGlobals();
  });

  it.each([new TypeError("Network request failed"), new Error("Request timed out")])(
    "retries a failed read without restoring the bot: %s",
    async (cause) => {
      rpc.mockRejectedValueOnce(cause);
      await act(async () => container.querySelector("button")!.click());
      expect(push).not.toHaveBeenCalled();
      expect(alert).toHaveBeenCalledWith("Could not load bot", expect.any(String), [
        { text: "Cancel", style: "cancel" },
        { text: "Try again.", onPress: expect.any(Function) },
      ]);
      rpc.mockResolvedValueOnce({});
      await act(async () => alert.mock.calls[0]![2][1].onPress());
      expect(push).toHaveBeenCalledWith({
        pathname: "/thread",
        params: { botId: bot.id, name: bot.name, readOnly: "1" },
      });
      expect(rpc.mock.calls.map(([procedure]) => procedure)).toEqual([
        "bots/listArchived",
        "threads/get",
        "threads/get",
      ]);
    },
  );

  it("keeps explicit restoration available after a server rejects the read", async () => {
    rpc.mockRejectedValueOnce(new Error("Internal server error"));
    await act(async () => container.querySelector("button")!.click());
    expect(push).not.toHaveBeenCalled();
    rpc.mockResolvedValueOnce({ ok: true });
    await act(async () => container.querySelectorAll("button")[1]!.click());
    expect(rpc).toHaveBeenLastCalledWith("bots/restore", { botId: bot.id });
    expect(container.textContent).toBe("No archived bots");
    expect(push).not.toHaveBeenCalled();
  });
});
