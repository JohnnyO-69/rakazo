import { describe, expect, it } from "vitest";
import {
  COMPUTER_KEYBOARD_READY_MESSAGE,
  COMPUTER_KEYBOARD_SEED,
  commandsForKeyboardChange,
  computerKeyboardChanges,
  computerKeyboardReadyProbe,
  computerKeyboardScript,
  createComputerKeyboardBridge,
  isComputerKeyboardReadyMessage,
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
    expect(edit.draft.endsWith("a\n")).toBe(true);
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
    expect(pasted.draft.endsWith("a\nb")).toBe(true);
    expect(commandsForKeyboardChange(pasted.changes, false)).toEqual([
      { type: "text", text: "a" },
      { type: "key", name: "Return" },
      { type: "text", text: "b" },
    ]);

    const windows = normalizeComputerKeyboardEdit(
      COMPUTER_KEYBOARD_SEED,
      `${COMPUTER_KEYBOARD_SEED}a\r\nb`,
    );
    expect(windows.draft.endsWith("a\nb")).toBe(true);
    expect(windows.changes).toEqual({ backspaces: 0, text: "a\nb" });
    expect(commandsForKeyboardChange(windows.changes, false)).toEqual([
      { type: "text", text: "a" },
      { type: "key", name: "Return" },
      { type: "text", text: "b" },
    ]);
  });

  it("keeps later backspaces on the remote return instead of skipping it", () => {
    const pasted = normalizeComputerKeyboardEdit(
      COMPUTER_KEYBOARD_SEED,
      `${COMPUTER_KEYBOARD_SEED}a\nb`,
    );
    const deletedB = normalizeComputerKeyboardEdit(pasted.draft, pasted.draft.slice(0, -1));
    expect(deletedB.changes).toEqual({ backspaces: 1, text: "" });
    expect(deletedB.draft.endsWith("a\n")).toBe(true);

    const deletedReturn = normalizeComputerKeyboardEdit(
      deletedB.draft,
      deletedB.draft.slice(0, -1),
    );
    expect(deletedReturn.changes).toEqual({ backspaces: 1, text: "" });
    expect(deletedReturn.draft.endsWith("a")).toBe(true);
    expect(deletedReturn.draft.includes("\n")).toBe(false);

    const deletedA = normalizeComputerKeyboardEdit(
      deletedReturn.draft,
      deletedReturn.draft.slice(0, -1),
    );
    expect(deletedA.changes).toEqual({ backspaces: 1, text: "" });
    expect(deletedA.draft).toBe(COMPUTER_KEYBOARD_SEED);

    const wiped = normalizeComputerKeyboardEdit(pasted.draft, COMPUTER_KEYBOARD_SEED);
    expect(wiped.changes).toEqual({ backspaces: 3, text: "" });
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

  it("queues commands until the screen keyboard bridge is ready", () => {
    const bridge = createComputerKeyboardBridge();
    const text = { type: "text" as const, text: "a" };
    const enter = { type: "key" as const, name: "Return" as const };
    expect(bridge.push(text)).toEqual([]);
    expect(bridge.push(enter)).toEqual([]);
    expect(bridge.ready()).toEqual([text, enter]);
    expect(bridge.push(text)).toEqual([text]);
    expect(bridge.ready()).toEqual([]);
    bridge.reset();
    expect(bridge.push(enter)).toEqual([]);
    expect(bridge.ready()).toEqual([enter]);
  });

  it("asks the screen page to report when the keyboard bridge exists", () => {
    const script = computerKeyboardReadyProbe('1"</script>');
    expect(script.endsWith(";true;")).toBe(true);
    expect(script).toContain("window.rakazoComputerKeyboard");
    expect(script).toContain("ReactNativeWebView.postMessage");
    expect(script).not.toContain("<");
    const literal = script.slice(
      script.indexOf("postMessage(") + "postMessage(".length,
      script.indexOf(");return"),
    );
    expect(JSON.parse(literal)).toBe(`${COMPUTER_KEYBOARD_READY_MESSAGE}:1"</script>`);
    expect(isComputerKeyboardReadyMessage(`${COMPUTER_KEYBOARD_READY_MESSAGE}:4`, "4")).toBe(true);
    expect(isComputerKeyboardReadyMessage(`${COMPUTER_KEYBOARD_READY_MESSAGE}:4`, "5")).toBe(false);
  });
});
