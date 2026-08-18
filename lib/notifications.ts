import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// expo-notifications nie wspiera weba — tam zapisujemy powiadomienia do
// globalnych rejestrów (przydatne też w testach e2e).
const isSupported = Platform.OS !== "web";

declare global {
  // eslint-disable-next-line no-var
  var __notificationLog: { title: string; body: string }[] | undefined;
  // eslint-disable-next-line no-var
  var __weeklySummary: { title: string; body: string } | null | undefined;
  // eslint-disable-next-line no-var
  var __notifPermission: "granted" | "undetermined" | undefined;
}

const WEEKLY_SUMMARY_ID = "weekly-summary";

/** Jednorazowa konfiguracja (handler pierwszego planu + kanał Android). */
export function configureNotifications(): void {
  if (!isSupported) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "Alerty budżetowe",
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }
}

export async function getPermissionStatus(): Promise<
  "granted" | "denied" | "undetermined"
> {
  if (!isSupported) {
    return globalThis.__notifPermission ?? "undetermined";
  }
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return "undetermined";
  }
}

export async function requestPermissions(): Promise<boolean> {
  if (!isSupported) {
    globalThis.__notifPermission = "granted";
    return true;
  }
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

/** Natychmiastowe lokalne powiadomienie. */
export async function sendLocalNotification(
  title: string,
  body: string
): Promise<void> {
  if (!isSupported) {
    globalThis.__notificationLog = globalThis.__notificationLog ?? [];
    globalThis.__notificationLog.push({ title, body });
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // brak zgody na powiadomienia — pomijamy po cichu
  }
}

/**
 * (Prze)planowuje cotygodniowe podsumowanie: niedziela 19:00.
 * Treść lokalnego powiadomienia jest stała w momencie planowania, więc
 * odświeżamy ją po każdej zmianie wydatków.
 */
export async function scheduleWeeklySummary(
  title: string,
  body: string
): Promise<void> {
  if (!isSupported) {
    globalThis.__weeklySummary = { title, body };
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_SUMMARY_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_SUMMARY_ID,
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // niedziela (1 = Sunday, jak w iOS)
        hour: 19,
        minute: 0,
      },
    });
  } catch {
    // np. brak zgody — pomijamy
  }
}

export async function cancelWeeklySummary(): Promise<void> {
  if (!isSupported) {
    globalThis.__weeklySummary = null;
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_SUMMARY_ID);
  } catch {}
}
