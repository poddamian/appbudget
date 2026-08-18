import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

import { useAuth } from "../../lib/auth";
import { translateAuthError } from "../../lib/authErrors";
import { useSettings } from "../../lib/settings";
import { supabase } from "../../lib/supabase";

type ToggleRowProps = {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
};

function ToggleRow({
  label,
  description,
  value,
  onChange,
  accessibilityLabel,
}: ToggleRowProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-100 py-3.5">
      <View className="mr-4 flex-1">
        <Text className="text-base font-medium text-gray-900">{label}</Text>
        <Text className="mt-0.5 text-sm text-gray-500">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#d1d5db", true: "#16a34a" }}
        thumbColor="#ffffff"
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const {
    settings,
    isLoading: settingsLoading,
    updateSetting,
    settingsErrorMessage,
    clearSettingsError,
  } = useSettings();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    setErrorMessage(null);
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setErrorMessage(translateAuthError(error));
      }
      // Po wylogowaniu guard w root layoucie pokaże ekran logowania.
    } catch (error) {
      setErrorMessage(translateAuthError(error));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6 pt-6">
        <Text className="text-2xl font-bold text-gray-900">Profil</Text>
        {session?.user.email ? (
          <Text className="mt-1 text-sm text-gray-500">
            Zalogowano jako {session.user.email}
          </Text>
        ) : null}

        <Text className="mb-1 mt-8 text-sm font-semibold uppercase text-gray-400">
          Budżet
        </Text>
        <Pressable
          onPress={() => router.push("/manage-categories")}
          className="flex-row items-center border-b border-gray-100 py-3.5 active:bg-gray-50"
          accessibilityLabel="Zarządzaj kategoriami"
        >
          <Ionicons name="grid-outline" size={20} color="#16a34a" />
          <Text className="ml-3 flex-1 text-base font-medium text-gray-900">
            Zarządzaj kategoriami
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </Pressable>
        <Pressable
          onPress={() => router.push("/premium")}
          className="flex-row items-center border-b border-gray-100 py-3.5 active:bg-gray-50"
          accessibilityLabel="BudgetTrack Premium"
        >
          <Ionicons name="star-outline" size={20} color="#d97706" />
          <Text className="ml-3 flex-1 text-base font-medium text-gray-900">
            BudgetTrack Premium
          </Text>
          <Text
            className={`mr-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              settings?.is_premium
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {settings?.is_premium ? "Aktywne" : "Darmowe"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </Pressable>

        <Text className="mb-1 mt-8 text-sm font-semibold uppercase text-gray-400">
          Powiadomienia
        </Text>

        {settingsLoading || !settings ? (
          <ActivityIndicator className="py-8" color="#16a34a" />
        ) : (
          <>
            <ToggleRow
              label="Alert przy 80% limitu"
              description="Powiadomienie, gdy kategoria przekroczy 80% budżetu"
              value={settings.alert_at_80_percent}
              onChange={(value) => updateSetting("alert_at_80_percent", value)}
              accessibilityLabel="Przełącznik alertu 80%"
            />
            <ToggleRow
              label="Alert przy 100% limitu"
              description="Powiadomienie, gdy limit kategorii zostanie wyczerpany"
              value={settings.alert_at_100_percent}
              onChange={(value) => updateSetting("alert_at_100_percent", value)}
              accessibilityLabel="Przełącznik alertu 100%"
            />
            <ToggleRow
              label="Tygodniowe podsumowanie"
              description="W niedzielę o 19:00: ile wydano i ile zostało"
              value={settings.weekly_summary_enabled}
              onChange={(value) =>
                updateSetting("weekly_summary_enabled", value)
              }
              accessibilityLabel="Przełącznik tygodniowego podsumowania"
            />
          </>
        )}

        {settingsErrorMessage ? (
          <Pressable
            onPress={clearSettingsError}
            className="mt-4 rounded-xl bg-red-50 px-4 py-3"
          >
            <Text className="text-sm text-red-700">{settingsErrorMessage}</Text>
          </Pressable>
        ) : null}

        {errorMessage ? (
          <View className="mt-4 rounded-xl bg-red-50 px-4 py-3">
            <Text className="text-sm text-red-700">{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="px-5 pb-8">
        <Pressable
          className={`items-center rounded-xl py-3.5 ${
            isSigningOut ? "bg-red-400" : "bg-red-600 active:bg-red-700"
          }`}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Wyloguj się
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
