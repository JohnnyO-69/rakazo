// @vitest-environment jsdom

import type { Bot } from "@rakazo/contracts";
import type { ComponentProps, ReactNode } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/rpc", () => ({
  rpc: {
    voice: { voices: vi.fn(async () => []) },
    models: {
      credentials: vi.fn(async () => []),
      list: vi.fn(async () => []),
    },
    me: vi.fn(async () => ({})),
  },
}));
vi.mock("@lingui/react/macro", () => {
  const t = (parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce((text, part, index) => `${text}${index > 0 ? values[index - 1] : ""}${part}`, "");
  return { useLingui: () => ({ t }), Trans: ({ children }: { children: ReactNode }) => children };
});
vi.mock("@rakazo/ui-web", () => ({
  Button: ({
    variant: _variant,
    size: _size,
    ...props
  }: ComponentProps<"button"> & { variant?: string; size?: string }) => <button {...props} />,
  Input: (props: ComponentProps<"input">) => <input {...props} />,
  Textarea: (props: ComponentProps<"textarea">) => <textarea {...props} />,
  NativeSelect: (props: ComponentProps<"select">) => <select {...props} />,
  NativeSelectOption: (props: ComponentProps<"option">) => <option {...props} />,
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: ComponentProps<"button"> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    />
  ),
  Toggle: ({
    pressed: _pressed,
    onPressedChange: _onPressedChange,
    ...props
  }: ComponentProps<"button"> & {
    pressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
    variant?: string;
  }) => <button type="button" {...props} />,
}));
vi.mock("../ScratchpadSection", () => ({ ScratchpadSection: () => null }));
vi.mock("../KnowledgeSection", () => ({ KnowledgeSection: () => null }));
vi.mock("./avatar-studio-popover", () => ({ AvatarStudioPopover: () => null }));
vi.mock("./bot-credentials", () => ({ BotCredentialsSection: () => null }));

import { BotSettings } from "./bot-panel";

const bot = {
  id: "bot-1",
  spaceId: "space-1",
  name: "Ada",
  title: "Helper",
  description: "Helps",
  instructions: "Helps",
  color: "ink",
  notifyOnFinish: true,
  pinned: false,
  sectionId: null,
  archivedAt: null,
  unread: false,
  parentBotId: null,
  memoryScope: null,
  threadId: "thread-1",
  preview: "",
  status: "idle",
  computerMode: "dedicated",
  updatedAt: "2026-09-01T00:00:00.000Z",
  createdAt: "2026-09-01T00:00:00.000Z",
  voiceId: null,
  autoSpeak: false,
  modelProvider: null,
  modelId: null,
  thinkingLevel: null,
  teamChatAmbientEnabled: false,
  teamChatRules: "",
  disabledBuiltinTools: ["remember"],
  webhookConfigured: false,
  spawnKey: null,
} as Bot;

let container: HTMLDivElement;
let root: Root;

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

async function renderSettings(
  onSave: (patch: { disabledBuiltinTools?: string[] }) => Promise<void>,
) {
  await act(async () => {
    root.render(
      <BotSettings
        bot={bot}
        memoryProviderConfigured={false}
        onSkillsChange={() => undefined}
        onSave={onSave}
        onExport={async () => undefined}
        onClear={() => undefined}
      />,
    );
  });
  await flush();
}

describe("BotSettings disabled tools", () => {
  it("omits the disabled-tool list from an unrelated save", async () => {
    const onSave = vi.fn(async () => undefined);
    await renderSettings(onSave);

    const save = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Save",
    );
    if (!save) throw new Error("Missing save button");
    await act(async () => {
      save.click();
    });
    await flush();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]?.[0]).not.toHaveProperty("disabledBuiltinTools");
  });

  it("sends the disabled-tool list when that list changes", async () => {
    const onSave = vi.fn(async () => undefined);
    await renderSettings(onSave);

    const toggle = container.querySelector<HTMLButtonElement>('[id$="-disabled-remember"]');
    if (!toggle) throw new Error("Missing tool toggle");
    await act(async () => {
      toggle.click();
    });
    await flush();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ disabledBuiltinTools: [] }));
  });
});
