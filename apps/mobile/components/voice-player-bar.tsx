import { resolvePersonaColorDef } from "@rakazo/core";
import { useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileBot, MobileSnapshot } from "../lib/api";
import { mobileTokens } from "../lib/appearance";
import { useI18n } from "../lib/i18n";
import { useThemedStyles } from "../lib/native";
import {
  getVoicePlaybackState,
  pauseVoicePlayback,
  resumeVoicePlayback,
  stopVoicePlayback,
  subscribeVoicePlayback,
} from "../lib/voice";
import { NativeSymbol } from "./native-symbol";

/**
 * Pause / Resume / Stop for a reply that is being spoken. Rendered only while
 * something is speaking or paused, as a normal block in the layout so it never
 * covers the message list or composer, and it follows the user across screens
 * because playback state lives in `lib/voice`.
 */
export function VoicePlayerBar({
  bots,
  members,
  style,
}: {
  bots: MobileBot[];
  members?: MobileSnapshot["members"];
  style?: { marginTop?: number; marginBottom?: number; marginHorizontal?: number };
}) {
  const { t } = useI18n();
  const styles = useThemedStyles(createStyles);
  const playback = useSyncExternalStore(subscribeVoicePlayback, getVoicePlaybackState);
  if (playback.status === "idle") return null;

  const speakerBot = playback.botId ? bots.find((bot) => bot.id === playback.botId) : undefined;
  const speakerMember = playback.botId
    ? members?.find((member) => member.botId === playback.botId)
    : undefined;
  const speakerName = speakerBot?.name || speakerMember?.name || t("Bot");
  const speakerColor = playback.botId
    ? resolvePersonaColorDef(playback.botId, speakerBot?.color ?? speakerMember?.color).light
    : mobileTokens().foreground;
  const paused = playback.status === "paused";

  return (
    <View style={[styles.bar, style]}>
      <NativeSymbol
        ios="waveform"
        android="pulse-outline"
        size={16}
        color={speakerColor}
      />
      <Text numberOfLines={1} style={[styles.name, { color: speakerColor }]}>
        {speakerName}
      </Text>
      {paused ? (
        <VoiceControlButton
          accessibilityLabel={t("Play")}
          onPress={resumeVoicePlayback}
          ios="play.fill"
          android="play"
        />
      ) : playback.canPause ? (
        <VoiceControlButton
          accessibilityLabel={t("Pause")}
          onPress={pauseVoicePlayback}
          ios="pause.fill"
          android="pause"
        />
      ) : null}
      <VoiceControlButton
        accessibilityLabel={t("Stop")}
        onPress={stopVoicePlayback}
        ios="stop.fill"
        android="stop"
      />
    </View>
  );
}

function VoiceControlButton({
  accessibilityLabel,
  onPress,
  ios,
  android,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  ios: string;
  android: Parameters<typeof NativeSymbol>[0]["android"];
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.button}
    >
      <NativeSymbol ios={ios} android={android} size={14} color={mobileTokens().foreground} />
    </Pressable>
  );
}

function createStyles() {
  const tokens = mobileTokens();
  return StyleSheet.create({
    bar: {
      marginHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 18,
      padding: 10,
      borderWidth: 1,
      borderColor: tokens.border,
      backgroundColor: tokens.card,
    },
    name: {
      flexGrow: 1,
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "600",
    },
    button: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: tokens.border,
      backgroundColor: tokens.background,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
