import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { loadSessionToken } from "./api";
import { notificationResponseRoute } from "./notification-open";

const openedResponses = new Set<string>();

export async function openNotificationResponse(
  response: Notifications.NotificationResponse | null | undefined,
): Promise<boolean> {
  if (!response) return false;
  const key = response.notification.request.identifier;
  if (!key || openedResponses.has(key)) return false;
  const target = notificationResponseRoute(response, Notifications.DEFAULT_ACTION_IDENTIFIER);
  if (!target) return false;
  // Claim before the session read so a cold-start hook and the tap listener
  // cannot both open the same response.
  openedResponses.add(key);
  try {
    if (!(await loadSessionToken())) {
      // Expo keeps this tap as the last response. Leaving it there would open
      // the thread on a later cold start, after sign-in, with no new tap.
      // A newer tap can become last while this session read is in flight;
      // clearing then would drop it before a cold start can open it.
      if (Notifications.getLastNotificationResponse()?.notification.request.identifier === key) {
        Notifications.clearLastNotificationResponse();
      }
      openedResponses.delete(key);
      return false;
    }
    router.push(target);
    return true;
  } catch {
    openedResponses.delete(key);
    return false;
  }
}

/** Opens the thread for a notification tap, including the tap that cold-started the app. */
export function useNotificationResponses(enabled: boolean): void {
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!enabled) return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void openNotificationResponse(response).then((opened) => {
        if (opened) Notifications.clearLastNotificationResponse();
      });
    });
    return () => subscription.remove();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !lastResponse) return;
    void openNotificationResponse(lastResponse).then((opened) => {
      if (opened) Notifications.clearLastNotificationResponse();
    });
  }, [enabled, lastResponse]);
}
