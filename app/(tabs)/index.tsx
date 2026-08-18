import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { CategoryCard } from "../../components/CategoryCard";
import { useExpenses } from "../../lib/expenses";
import { formatPln } from "../../lib/format";

const monthInfo = () => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate() + 1; // łącznie z dzisiaj
  const endLabel = `${String(lastDay).padStart(2, "0")}.${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
  return { daysLeft, endLabel };
};

export default function TodayScreen() {
  const router = useRouter();
  const {
    categories,
    monthExpenses,
    isLoading,
    totalLimit,
    spentThisMonth,
    spentByCategory,
    lastAddedAt,
    saveErrorMessage,
    clearSaveError,
    refresh,
  } = useExpenses();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const remaining = totalLimit - spentThisMonth;
  const { daysLeft, endLabel } = monthInfo();
  const dailyBudget = Math.max(remaining, 0) / daysLeft;
  const hasExpenses = monthExpenses.length > 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Krótka animacja potwierdzenia po dodaniu wydatku.
  const confirmationOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!lastAddedAt) {
      return;
    }
    Animated.sequence([
      Animated.timing(confirmationOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(confirmationOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [lastAddedAt, confirmationOpacity]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-28 pt-6"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#16a34a"
            colors={["#16a34a"]}
          />
        }
      >
        {/* Nagłówek — najważniejsza liczba na ekranie */}
        <View className="items-center">
          <Text className="text-base font-medium text-gray-500">
            Zostało do końca miesiąca
          </Text>
          <Text
            className={`mt-1 text-6xl font-bold ${
              remaining < 0 ? "text-red-600" : "text-gray-900"
            }`}
          >
            {formatPln(remaining)}
          </Text>
          <Text className="mt-2 text-sm text-gray-500">
            {formatPln(dailyBudget)} dziennie do {endLabel} (koniec miesiąca)
          </Text>
        </View>

        {saveErrorMessage ? (
          <Pressable
            onPress={clearSaveError}
            className="mt-5 rounded-xl bg-red-50 px-4 py-3"
          >
            <Text className="text-sm text-red-700">{saveErrorMessage}</Text>
          </Pressable>
        ) : null}

        {/* Kategorie albo empty state */}
        {hasExpenses ? (
          <View className="mt-8">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                spent={spentByCategory[category.id] ?? 0}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/history",
                    params: { categoryId: category.id },
                  })
                }
              />
            ))}
          </View>
        ) : (
          <View className="mt-14 items-center px-6">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <Ionicons name="receipt-outline" size={28} color="#16a34a" />
            </View>
            <Text className="mt-4 text-center text-lg font-semibold text-gray-900">
              Brak wydatków w tym miesiącu
            </Text>
            <Text className="mt-1 text-center text-base text-gray-500">
              Świetny start! Dodaj pierwszy wydatek przyciskiem „+", a tutaj
              zobaczysz, jak ma się Twój budżet.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Potwierdzenie dodania */}
      <Animated.View
        pointerEvents="none"
        style={{ opacity: confirmationOpacity }}
        className="absolute left-0 right-0 top-16 items-center"
      >
        <View className="flex-row items-center rounded-full bg-green-600 px-4 py-2">
          <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
          <Text className="ml-1.5 text-sm font-semibold text-white">
            Dodano wydatek
          </Text>
        </View>
      </Animated.View>

      {/* Floating action button */}
      <Pressable
        onPress={() => router.push("/add-expense")}
        className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-full bg-green-600 shadow-lg active:bg-green-700"
        accessibilityLabel="Dodaj wydatek"
      >
        <Ionicons name="add" size={34} color="#ffffff" />
      </Pressable>
    </View>
  );
}
