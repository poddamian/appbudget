import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useAuth } from "../lib/auth";
import { getPermissionStatus, requestPermissions } from "../lib/notifications";

const promptKey = (userId: string) => `notif_prompt_done:${userId}`;

/**
 * Kontekstowy pre-prompt o powiadomienia — pokazywany raz, zanim
 * wywołamy surowy systemowy popup.
 */
export function NotificationPrompt() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsVisible(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const alreadyAsked =
          (await AsyncStorage.getItem(promptKey(userId))) === "true";
        if (alreadyAsked) {
          return;
        }
        const status = await getPermissionStatus();
        if (!cancelled && status === "undetermined") {
          setIsVisible(true);
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const dismiss = async (requestSystem: boolean) => {
    setIsVisible(false);
    if (userId) {
      AsyncStorage.setItem(promptKey(userId), "true").catch(() => {});
    }
    if (requestSystem) {
      await requestPermissions();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View className="absolute inset-0 items-center justify-end bg-black/40 px-5 pb-10">
      <View className="w-full rounded-2xl bg-white p-6">
        <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Ionicons name="notifications" size={24} color="#16a34a" />
        </View>
        <Text className="text-xl font-bold text-gray-900">
          Włącz alerty budżetowe
        </Text>
        <Text className="mt-2 text-base text-gray-500">
          Damy Ci znać, gdy zbliżysz się do limitu w którejś kategorii, i raz w
          tygodniu podsumujemy Twoje wydatki. Bez spamu — obiecujemy.
        </Text>
        <Pressable
          onPress={() => dismiss(true)}
          className="mt-5 items-center rounded-xl bg-green-600 py-3.5 active:bg-green-700"
        >
          <Text className="text-base font-semibold text-white">
            Włącz powiadomienia
          </Text>
        </Pressable>
        <Pressable
          onPress={() => dismiss(false)}
          className="mt-2 items-center rounded-xl py-3"
        >
          <Text className="text-base font-medium text-gray-500">Nie teraz</Text>
        </Pressable>
      </View>
    </View>
  );
}
