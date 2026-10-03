import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useKeyboardState } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ComputerKeyboardCommand, ComputerKeyName } from "../lib/computer-keyboard";
import {
  COMPUTER_KEYBOARD_SEED,
  commandsForKeyboardChange,
  normalizeComputerKeyboardEdit,
} from "../lib/computer-keyboard";
import { useI18n } from "../lib/i18n";
import { useMobileTokens, useResolvedAppearance } from "../lib/native";
import { NativeSymbol } from "./native-symbol";

function keySpecs(t: (message: string) => string): Array<{
  name: ComputerKeyName;
  label: string;
  accessibilityLabel: string;
}> {
  return [
    { name: "Escape", label: "Esc", accessibilityLabel: t("Escape") },
    { name: "Tab", label: "Tab", accessibilityLabel: t("Tab") },
    { name: "ArrowLeft", label: "←", accessibilityLabel: t("Left") },
    { name: "ArrowDown", label: "↓", accessibilityLabel: t("Down") },
    { name: "ArrowUp", label: "↑", accessibilityLabel: t("Up") },
    { name: "ArrowRight", label: "→", accessibilityLabel: t("Right") },
  ];
}

export function ComputerKeyboardBar({
  onCommand,
}: {
  onCommand: (command: ComputerKeyboardCommand) => void;
}) {
  const { t } = useI18n();
  const tokens = useMobileTokens();
  const appearance = useResolvedAppearance();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const inputRef = useRef<TextInput>(null);
  const returnAt = useRef(0);
  const [draft, setDraft] = useState(COMPUTER_KEYBOARD_SEED);
  const [open, setOpen] = useState(false);
  const [control, setControl] = useState(false);

  function send(command: ComputerKeyboardCommand) {
    onCommand(command);
  }

  function emitReturn(latched: boolean) {
    send(
      latched ? { type: "key", name: "Return", control: true } : { type: "key", name: "Return" },
    );
  }

  function onChangeText(next: string) {
    const edit = normalizeComputerKeyboardEdit(draft, next);
    const latched = control;
    for (const command of commandsForKeyboardChange(edit.changes, latched)) send(command);
    if (edit.returns > 0) {
      returnAt.current = Date.now();
      for (let index = 0; index < edit.returns; index += 1) emitReturn(latched);
    }
    if (latched && (edit.changes.text || edit.changes.backspaces > 0 || edit.returns > 0)) {
      setControl(false);
    }
    setDraft(edit.draft);
    if (next.length < 1) inputRef.current?.focus();
  }

  function onSubmitEditing() {
    const now = Date.now();
    if (now - returnAt.current < 30) return;
    returnAt.current = now;
    emitReturn(control);
    if (control) setControl(false);
  }

  function press(name: ComputerKeyName) {
    send(control ? { type: "key", name, control: true } : { type: "key", name });
    if (control) setControl(false);
  }

  const keys = keySpecs(t);
  const keyStyle = {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 10,
    backgroundColor: tokens.muted,
    paddingHorizontal: 2,
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderTopWidth: 1,
        borderTopColor: tokens.border,
        backgroundColor: tokens.background,
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8),
      }}
    >
      <TextInput
        ref={inputRef}
        value={draft}
        onChangeText={onChangeText}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        keyboardAppearance={appearance}
        accessibilityLabel={t("Computer keyboard")}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0.02, bottom: 0, left: 0 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? t("Hide keyboard") : t("Show keyboard")}
        accessibilityState={{ selected: open }}
        onPress={() => (open ? inputRef.current?.blur() : inputRef.current?.focus())}
        hitSlop={4}
        style={{
          width: 40,
          minHeight: 40,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: open ? tokens.primary : tokens.border,
          borderRadius: 10,
          backgroundColor: open ? tokens.primary : tokens.muted,
        }}
      >
        <NativeSymbol
          ios="keyboard"
          android="keypad-outline"
          size={18}
          color={open ? tokens.primaryForeground : tokens.foreground}
        />
      </Pressable>
      {keys.slice(0, 2).map((key) => (
        <Pressable
          key={key.name}
          accessibilityRole="button"
          accessibilityLabel={key.accessibilityLabel}
          onPress={() => press(key.name)}
          hitSlop={4}
          style={keyStyle}
        >
          <Text
            numberOfLines={1}
            style={{ color: tokens.foreground, fontSize: 13, fontWeight: "600" }}
          >
            {key.label}
          </Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Control")}
        accessibilityState={{ selected: control }}
        onPress={() => setControl((value) => !value)}
        hitSlop={4}
        style={{
          ...keyStyle,
          borderColor: control ? tokens.primary : tokens.border,
          backgroundColor: control ? tokens.primary : tokens.muted,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: control ? tokens.primaryForeground : tokens.foreground,
            fontSize: 13,
            fontWeight: "600",
          }}
        >
          Ctrl
        </Text>
      </Pressable>
      {keys.slice(2).map((key) => (
        <Pressable
          key={key.name}
          accessibilityRole="button"
          accessibilityLabel={key.accessibilityLabel}
          onPress={() => press(key.name)}
          hitSlop={4}
          style={keyStyle}
        >
          <Text numberOfLines={1} style={{ color: tokens.foreground, fontSize: 16 }}>
            {key.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
