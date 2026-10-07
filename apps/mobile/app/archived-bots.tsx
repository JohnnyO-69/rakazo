import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text } from "react-native";
import { ArchivedBotList } from "../components/archived-bot-list";
import type { MobileBot } from "../lib/api";
import { rpc } from "../lib/api";
import { confirmDeleteBot, restoreArchivedBot } from "../lib/bot-lifecycle";
import { useI18n } from "../lib/i18n";
import { useMobileTokens } from "../lib/native";
import { errorText } from "../lib/user-error";

export default function ArchivedBots() {
  const { t } = useI18n();
  const router = useRouter();
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

  async function restore(bot: MobileBot) {
    if (pending) return;
    setPending(true);
    try {
      await restoreArchivedBot(bot.id);
      setBots((current) => current?.filter((item) => item.id !== bot.id) ?? null);
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

  async function open(bot: MobileBot) {
    if (pending) return;
    setPending(true);
    try {
      await rpc("threads/get", { botId: bot.id });
      router.push({
        pathname: "/thread",
        params: { botId: bot.id, name: bot.name, readOnly: "1" },
      });
    } catch (cause) {
      Alert.alert(t("Could not load bot"), errorText(cause, t("Try again.")), [
        { text: t("Cancel"), style: "cancel" },
        { text: t("Try again."), onPress: () => void open(bot) },
      ]);
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
