import { describe, expect, it } from "vitest";
import {
  COMPUTER_KEYBOARD_SEED,
  commandsForKeyboardChange,
  computerKeyboardChanges,
  computerKeyboardScript,
  nextComputerKeyboardDraft,
  normalizeComputerKeyboardEdit,
} from "./computer-keyboard";

describe("computer keyboard edits", () => {
  it("translates inserted and deleted text", () => {
    expect(computerKeyboardChanges("___", "___a", 4)).toEqual({ backspaces: 0, text: "a" });
    expect(computerKeyboardChanges("___a", "___", 3)).toEqual({ backspaces: 1, text: "" });
  });

  it("turns a return into an Enter command and keeps the shadow buffer stocked", () => {
    const edit = normalizeComputerKeyboardEdit(
      COMPUTER_KEYBOARD_SEED,
      `${COMPUTER_KEYBOARD_SEED}a\n`,
    );
    expect(edit.changes).toEqual({ backspaces: 0, text: "a\n" });
    expect(edit.draft.endsWith("a")).toBe(true);
    expect(edit.draft.includes("\n")).toBe(false);
    expect(commandsForKeyboardChange(edit.changes, false)).toEqual([
      { type: "text", text: "a" },
      { type: "key", name: "Return" },
    ]);
    expect(nextComputerKeyboardDraft("")).toBe(COMPUTER_KEYBOARD_SEED);
  });

  it("keeps a return between the characters on either side", () => {
    const pasted = normalizeComputerKeyboardEdit(
      COMPUTER_KEYBOARD_SEED,
      `${COMPUTER_KEYBOARD_SEED}a\nb`,
    );
    expect(pasted.changes).toEqual({ backspaces: 0, text: "a\nb" });
    expect(pasted.draft.endsWith("ab")).toBe(true);
    expect(commandsForKeyboardChange(pasted.changes, false)).toEqual([
      { type: "text", text: "a" },
      { type: "key", name: "Return" },
      { type: "text", text: "b" },
    ]);

    const windows = normalizeComputerKeyboardEdit(
      COMPUTER_KEYBOARD_SEED,
      `${COMPUTER_KEYBOARD_SEED}a\r\nb`,
    );
    expect(commandsForKeyboardChange(windows.changes, false)).toEqual([
      { type: "text", text: "a" },
      { type: "key", name: "Return" },
      { type: "text", text: "b" },
    ]);
  });

  it("sends Ctrl as a chord on only the next key", () => {
    expect(commandsForKeyboardChange({ backspaces: 0, text: "c" }, true)).toEqual([
      { type: "char", text: "c", control: true },
    ]);
    expect(commandsForKeyboardChange({ backspaces: 0, text: "cd" }, true)).toEqual([
      { type: "char", text: "c", control: true },
      { type: "text", text: "d" },
    ]);
    expect(commandsForKeyboardChange({ backspaces: 2, text: "e" }, true)).toEqual([
      { type: "key", name: "Backspace", control: true },
      { type: "backspace", count: 1 },
      { type: "text", text: "e" },
    ]);
    expect(commandsForKeyboardChange({ backspaces: 0, text: "\nb" }, true)).toEqual([
      { type: "key", name: "Return", control: true },
      { type: "text", text: "b" },
    ]);
    expect(commandsForKeyboardChange({ backspaces: 2, text: "" }, false)).toEqual([
      { type: "backspace", count: 2 },
    ]);
  });

  it("embeds commands as JSON that cannot break out of the injected call", () => {
    const script = computerKeyboardScript({
      type: "text",
      text: '</script>\u2028");alert(1)',
    });
    expect(script.startsWith("window.rakazoComputerKeyboard?.run(")).toBe(true);
    expect(script.endsWith(");true;")).toBe(true);
    const json = script.slice("window.rakazoComputerKeyboard?.run(".length, -");true;".length);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual({ type: "text", text: '</script>\u2028");alert(1)' });
  });
});
