import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";

import { useSettings } from "../lib/settings";

type FeatureRowProps = {
  label: string;
  free: string | boolean;
  premium: string | boolean;
};

function FeatureCell({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <Text className="text-center text-sm text-gray-700">{value}</Text>;
  }
  return value ? (
    <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
  ) : (
    <Ionicons name="close-circle" size={20} color="#d1d5db" />
  );
}

function FeatureRow({ label, free, premium }: FeatureRowProps) {
  return (
    <View className="flex-row items-center border-b border-gray-100 py-3">
      <Text className="flex-1 text-base text-gray-900">{label}</Text>
      <View className="w-20 items-center">
        <FeatureCell value={free} />
      </View>
      <View className="w-20 items-center">
        <FeatureCell value={premium} />
      </View>
    </View>
  );
}

export default function PremiumScreen() {
  const router = useRouter();
  const { settings, updateSetting } = useSettings();
  const isPremium = settings?.is_premium ?? false;

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center px-5 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          accessibilityLabel="Wróć"
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </Pressable>
        <Text className="ml-3 text-lg font-semibold text-gray-900">
          BudgetTrack Premium
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-6">
        <View className="items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Ionicons name="star" size={30} color="#d97706" />
          </View>
          <Text className="mt-4 text-center text-2xl font-bold text-gray-900">
            Pełna kontrola nad budżetem
          </Text>
        </View>

        {/* Porównanie planów */}
        <View className="mt-8 rounded-2xl border border-gray-200 p-4">
          <View className="flex-row items-center border-b border-gray-200 pb-3">
            <View className="flex-1" />
            <Text className="w-20 text-center text-sm font-semibold text-gray-500">
              Darmowe
            </Text>
            <Text className="w-20 text-center text-sm font-semibold text-amber-600">
              Premium
            </Text>
          </View>
          <FeatureRow label="Kategorie" free="6" premium="Bez limitu" />
          <FeatureRow label="Historia wydatków" free="3 miesiące" premium="Pełna" />
          <FeatureRow label="Eksport do CSV" free={false} premium={true} />
          <FeatureRow
            label="Integracja bankowa (wkrótce)"
            free={false}
            premium={true}
          />
        </View>

        {isPremium ? (
          <View className="mt-6 rounded-2xl bg-green-50 p-5">
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
              <Text className="ml-2 text-lg font-bold text-gray-900">
                Masz aktywne Premium
              </Text>
            </View>
            <Text className="mt-1 text-sm text-gray-500">
              Dziękujemy za wsparcie! Wszystkie funkcje są odblokowane.
            </Text>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm text-gray-500">
                Tryb testowy — wyłącz Premium
              </Text>
              <Switch
                value={isPremium}
                onValueChange={(value) => updateSetting("is_premium", value)}
                trackColor={{ false: "#d1d5db", true: "#16a34a" }}
                thumbColor="#ffffff"
                accessibilityLabel="Przełącznik Premium (testowy)"
              />
            </View>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => updateSetting("is_premium", true)}
              className="mt-6 items-center rounded-xl bg-green-600 py-4 active:bg-green-700"
              accessibilityLabel="Wypróbuj Premium za darmo przez 7 dni"
            >
              <Text className="text-base font-bold text-white">
                Wypróbuj za darmo przez 7 dni
              </Text>
            </Pressable>
            <Text className="mt-3 text-center text-xs text-gray-400">
              Wersja testowa — płatności (RevenueCat) podłączymy w kolejnym
              kroku. Ten przycisk włącza Premium lokalnie na Twoim koncie.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
