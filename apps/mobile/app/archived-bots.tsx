import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, ScrollView, Text } from "react-native";
import { ArchivedBotList } from "../components/archived-bot-list";
import type { MobileBot } from "../lib/api";
import { rpc } from "../lib/api";
import { confirmDeleteBot, restoreArchivedBot } from "../lib/bot-lifecycle";
import { useI18n } from "../lib/i18n";
import { useMobileTokens, useResolvedAppearance } from "../lib/native";
import { errorText } from "../lib/user-error";

export default function ArchivedBots() {
  const { t } = useI18n();
  const router = useRouter();
  const scheme = useResolvedAppearance();
  const tokens = useMobileTokens();
  const [bots, setBots] = useState<MobileBot[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void rpc<MobileBot[]>("bots/listArchived")
        .then((next) => {
          if (active) {
            setBots(next);
            setError(null);
          }
        })
        .catch((cause) => {
          if (active) setError(errorText(cause, t("Could not load bots")));
        });
      return () => {
        active = false;
      };
    }, [t]),
  );

  async function restore(bot: MobileBot, viewChat = false) {
    if (pending) return;
    setPending(true);
    try {
      await restoreArchivedBot(bot.id);
      setBots((current) => current?.filter((item) => item.id !== bot.id) ?? null);
      if (viewChat) router.push({ pathname: "/thread", params: { botId: bot.id, name: bot.name } });
    } catch (cause) {
      Alert.alert(t("Could not restore bot"), errorText(cause, t("Try again.")));
    } finally {
      setPending(false);
    }
  }

  function remove(bot: MobileBot) {
    if (pending) return;
    confirmDeleteBot(bot, () =>
      setBots((current) => current?.filter((item) => item.id !== bot.id) ?? null),
    );
  }

  function viewChat(bot: MobileBot) {
    // Older servers exclude archived bots. Restoring is explicit, never a tap side effect.
    Alert.alert(
      t("Restore to view chat?"),
      t("Archived chats are unavailable until the bot is restored."),
      [
        { text: t("Cancel"), style: "cancel" },
        { text: t("Restore"), onPress: () => void restore(bot, true) },
      ],
    );
  }

  function legacyActions(bot: MobileBot) {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: bot.name,
          options: [t("Restore"), t("View chat"), t("Delete"), t("Cancel")],
          cancelButtonIndex: 3,
          destructiveButtonIndex: 2,
          userInterfaceStyle: scheme,
        },
        (index) => {
          if (index === 0) void restore(bot);
          else if (index === 1) viewChat(bot);
          else if (index === 2) remove(bot);
        },
      );
    } else {
      Alert.alert(
        bot.name,
        undefined,
        [
          { text: t("Restore"), onPress: () => void restore(bot) },
          { text: t("View chat"), onPress: () => viewChat(bot) },
          { text: t("Delete"), style: "destructive", onPress: () => remove(bot) },
        ],
        { cancelable: true },
      );
    }
  }

  async function open(bot: MobileBot) {
    if (pending) return;
    setPending(true);
    try {
      await rpc("threads/get", { botId: bot.id });
      router.push({
        pathname: "/thread",
        params: { botId: bot.id, name: bot.name, readOnly: "1" },
      });
    } catch {
      // Older self-hosted servers reject reads for archived bots. Keep explicit restore/delete available.
      legacyActions(bot);
    } finally {
      setPending(false);
    }
  }

  if (!bots?.length || error)
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: tokens.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 24 }}
      >
        {error ? (
          <Text accessibilityRole="alert" style={{ color: tokens.destructive }}>
            {error}
          </Text>
        ) : bots ? (
          <Text style={{ color: tokens.mutedForeground }}>{t("No archived bots")}</Text>
        ) : (
          <ActivityIndicator color={tokens.foreground} />
        )}
      </ScrollView>
    );
  return (
    <ArchivedBotList
      bots={bots}
      pending={pending}
      onOpen={(bot) => void open(bot)}
      onRestore={(bot) => void restore(bot)}
      onDelete={remove}
    />
  );
}
