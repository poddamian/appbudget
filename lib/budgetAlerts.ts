import AsyncStorage from "@react-native-async-storage/async-storage";

import { sendLocalNotification } from "./notifications";
import type { Category, UserSettings } from "../types/database";

const THRESHOLDS = [100, 80] as const;
export type AlertThreshold = (typeof THRESHOLDS)[number];

const monthKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const sentKey = (
  userId: string,
  categoryId: string,
  threshold: AlertThreshold
): string => `alert_sent:${userId}:${categoryId}:${threshold}:${monthKey()}`;

const formatShortPln = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(".", ",");
};

const isThresholdEnabled = (
  settings: UserSettings,
  threshold: AlertThreshold
): boolean =>
  threshold === 80 ? settings.alert_at_80_percent : settings.alert_at_100_percent;

export function buildAlertMessage(
  category: Category,
  threshold: AlertThreshold,
  spent: number
): string {
  return `Uwaga: wykorzystałeś już ${threshold}% budżetu na ${category.name} (${formatShortPln(spent)}/${formatShortPln(Number(category.monthly_limit))} zł)`;
}

/**
 * Po dodaniu/edycji wydatku sprawdza progi 80%/100% dla kategorii
 * i wysyła lokalne powiadomienie — raz na kategorię+próg+miesiąc.
 * Przy przekroczeniu obu progów naraz wysyła tylko wyższy (100%),
 * ale oznacza oba jako wysłane, żeby nie spamować.
 */
export async function checkBudgetAlerts({
  userId,
  category,
  spentAfter,
  settings,
}: {
  userId: string;
  category: Category;
  spentAfter: number;
  settings: UserSettings;
}): Promise<void> {
  const limit = Number(category.monthly_limit);
  if (limit <= 0) {
    return;
  }
  const percent = (spentAfter / limit) * 100;

  for (const threshold of THRESHOLDS) {
    if (percent < threshold || !isThresholdEnabled(settings, threshold)) {
      continue;
    }

    const key = sentKey(userId, category.id, threshold);
    let alreadySent = false;
    try {
      alreadySent = (await AsyncStorage.getItem(key)) === "true";
    } catch {}

    if (alreadySent) {
      // Wyższy próg już obsłużony — niższych nie sprawdzamy ponownie,
      // i tak byłyby oznaczone.
      continue;
    }

    await sendLocalNotification(
      "BudgetTrack",
      buildAlertMessage(category, threshold, spentAfter)
    );

    // Oznacz ten próg i wszystkie niższe jako wysłane w tym miesiącu.
    try {
      await Promise.all(
        THRESHOLDS.filter((t) => t <= threshold).map((t) =>
          AsyncStorage.setItem(sentKey(userId, category.id, t), "true")
        )
      );
    } catch {}

    // Tylko jedno powiadomienie na raz — najwyższy przekroczony próg.
    return;
  }
}
