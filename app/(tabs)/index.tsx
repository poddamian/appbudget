import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Pressable, Text, View } from "react-native";

import { useExpenses } from "../../lib/expenses";
import { formatPln } from "../../lib/format";

export default function TodayScreen() {
  const router = useRouter();
  const {
    isLoading,
    totalLimit,
    spentThisMonth,
    spentToday,
    lastAddedAt,
    saveErrorMessage,
    clearSaveError,
  } = useExpenses();

  const remaining = totalLimit - spentThisMonth;

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

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        {isLoading ? (
          <ActivityIndicator size="large" color="#16a34a" />
        ) : (
          <>
            <Text className="text-base font-medium text-gray-500">
              Zostało w tym miesiącu
            </Text>
            <Text
              className={`mt-1 text-5xl font-bold ${
                remaining < 0 ? "text-red-600" : "text-gray-900"
              }`}
            >
              {formatPln(remaining)}
            </Text>
            <Text className="mt-3 text-base text-gray-500">
              Dziś wydano {formatPln(spentToday)}
            </Text>
          </>
        )}

        {saveErrorMessage ? (
          <Pressable
            onPress={clearSaveError}
            className="mt-6 rounded-xl bg-red-50 px-4 py-3"
          >
            <Text className="text-sm text-red-700">{saveErrorMessage}</Text>
          </Pressable>
        ) : null}
      </View>

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
