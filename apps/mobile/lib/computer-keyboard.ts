export const COMPUTER_KEYBOARD_SEED = "_".repeat(99);

export const NATIVE_COMPUTER_KEYBOARD_BOOT = "window.__rakazoNativeKeys=true;true;";

export type ComputerKeyName =
  | "Escape"
  | "Tab"
  | "Return"
  | "Backspace"
  | "ArrowLeft"
  | "ArrowUp"
  | "ArrowRight"
  | "ArrowDown";

export type ComputerKeyboardCommand =
  | { type: "text"; text: string }
  | { type: "backspace"; count: number }
  | { type: "key"; name: ComputerKeyName; control?: boolean }
  | { type: "char"; text: string; control?: boolean };

/** Same edit shape as the in-viewer keyboard: insertions and deletions. */
export function computerKeyboardChanges(
  oldValue: string,
  newValue: string,
  selectionStart = newValue.length,
): { backspaces: number; text: string } {
  const newLength = Math.max(selectionStart ?? newValue.length, newValue.length);
  const oldLength = oldValue.length;
  let inputCount = newLength - oldLength;
  let backspaces = inputCount < 0 ? -inputCount : 0;

  for (let index = 0; index < Math.min(oldLength, newLength); index += 1) {
    if (newValue.charAt(index) !== oldValue.charAt(index)) {
      inputCount = newLength - index;
      backspaces = oldLength - index;
      break;
    }
  }

  return {
    backspaces,
    text: newValue.slice(newLength - inputCount, newLength),
  };
}

export function nextComputerKeyboardDraft(next: string): string {
  if (next.length < 1 || next.length > COMPUTER_KEYBOARD_SEED.length * 2) {
    return COMPUTER_KEYBOARD_SEED;
  }
  return next;
}

/** Strip returns out of a phone text edit so they can be sent as Enter. */
export function normalizeComputerKeyboardEdit(
  oldValue: string,
  nextValue: string,
): { changes: { backspaces: number; text: string }; returns: number; draft: string } {
  const returns = nextValue.match(/\r\n|\n|\r/g)?.length ?? 0;
  const normalized = nextValue.replace(/\r\n|\r|\n/g, "");
  return {
    changes: computerKeyboardChanges(oldValue, normalized),
    returns,
    draft: nextComputerKeyboardDraft(normalized),
  };
}

export function commandsForKeyboardChange(
  changes: { backspaces: number; text: string },
  control: boolean,
): ComputerKeyboardCommand[] {
  const commands: ComputerKeyboardCommand[] = [];
  if (changes.backspaces > 0) {
    if (control) {
      for (let index = 0; index < changes.backspaces; index += 1) {
        commands.push({ type: "key", name: "Backspace", control: true });
      }
    } else {
      commands.push({ type: "backspace", count: changes.backspaces });
    }
  }

  let plain = "";
  const flush = () => {
    if (!plain) return;
    commands.push({ type: "text", text: plain });
    plain = "";
  };
  for (const character of changes.text) {
    if (control) {
      flush();
      commands.push({ type: "char", text: character, control: true });
      continue;
    }
    plain += character;
  }
  flush();
  return commands;
}

/** JSON embedded as a JS expression. Escapes break out of the injected call. */
export function computerKeyboardScript(command: ComputerKeyboardCommand): string {
  const json = JSON.stringify(command)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `window.rakazoComputerKeyboard?.run(${json});true;`;
}
