import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { categoryIcon } from "../../lib/categoryIcons";
import { useExpenses } from "../../lib/expenses";
import { formatPln } from "../../lib/format";
import type { Expense } from "../../types/database";

const formatDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
};

export default function HistoryScreen() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const { categories, monthExpenses, isLoading } = useExpenses();

  const activeCategory =
    categories.find((category) => category.id === categoryId) ?? null;
  const expenses = activeCategory
    ? monthExpenses.filter(
        (expense) => expense.category_id === activeCategory.id
      )
    : monthExpenses;

  const categoryById = Object.fromEntries(
    categories.map((category) => [category.id, category])
  );

  const renderExpense = ({ item }: { item: Expense }) => {
    const category = categoryById[item.category_id];
    return (
      <View className="mb-2.5 flex-row items-center rounded-xl border border-gray-200 bg-white px-4 py-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-green-50">
          <Ionicons
            name={categoryIcon(category?.icon ?? "")}
            size={18}
            color="#16a34a"
          />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-medium text-gray-900">
            {category?.name ?? "Inna kategoria"}
            {item.note ? ` — ${item.note}` : ""}
          </Text>
          <Text className="mt-0.5 text-sm text-gray-500">
            {formatDate(item.date)}
          </Text>
        </View>
        <Text className="text-base font-semibold text-gray-900">
          {formatPln(Number(item.amount))}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white px-5 pt-6">
      <Text className="text-2xl font-bold text-gray-900">Historia</Text>
      <Text className="mt-1 text-sm text-gray-500">Bieżący miesiąc</Text>

      {activeCategory ? (
        <Pressable
          onPress={() => router.setParams({ categoryId: "" })}
          className="mt-3 flex-row items-center self-start rounded-full bg-green-600 py-1.5 pl-3 pr-2"
          accessibilityLabel={`Wyczyść filtr kategorii ${activeCategory.name}`}
        >
          <Text className="text-sm font-semibold text-white">
            {activeCategory.name}
          </Text>
          <Ionicons
            name="close-circle"
            size={18}
            color="#ffffff"
            style={{ marginLeft: 4 }}
          />
        </Pressable>
      ) : null}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : expenses.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 pb-16">
          <Ionicons name="list-outline" size={28} color="#9ca3af" />
          <Text className="mt-3 text-center text-base text-gray-500">
            {activeCategory
              ? `Brak wydatków w kategorii „${activeCategory.name}" w tym miesiącu.`
              : "Brak wydatków w tym miesiącu."}
          </Text>
        </View>
      ) : (
        <FlatList
          className="mt-4"
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpense}
          contentContainerClassName="pb-8"
        />
      )}
    </View>
  );
}
