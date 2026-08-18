import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  SectionList,
  Text,
  View,
} from "react-native";

import { ExpenseRow } from "../../components/ExpenseRow";
import { useExpenses } from "../../lib/expenses";
import { formatPln, localDateString } from "../../lib/format";
import { useSettings } from "../../lib/settings";
import type { Expense } from "../../types/database";

const sectionTitle = (isoDate: string): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isoDate === localDateString(today)) {
    return "Dzisiaj";
  }
  if (isoDate === localDateString(yesterday)) {
    return "Wczoraj";
  }
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
};

export default function HistoryScreen() {
  const router = useRouter();
  const { categoryId: paramCategoryId } = useLocalSearchParams<{
    categoryId?: string;
  }>();
  const {
    categories,
    monthExpenses,
    history,
    setHistoryFilter,
    loadMoreHistory,
    deleteExpense,
  } = useExpenses();
  const { settings } = useSettings();
  const isPremium = settings?.is_premium ?? false;

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );

  // Parametr z linku (tap w kartę na "Dziś") ustawia filtr.
  useEffect(() => {
    setHistoryFilter(paramCategoryId ? paramCategoryId : null);
  }, [paramCategoryId, setHistoryFilter]);

  const activeCategoryId = history.categoryId;
  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Podsumowanie: bieżący miesiąc w ramach aktywnego filtra.
  const monthSum = useMemo(
    () =>
      monthExpenses.reduce(
        (sum, expense) =>
          !activeCategoryId || expense.category_id === activeCategoryId
            ? sum + Number(expense.amount)
            : sum,
        0
      ),
    [monthExpenses, activeCategoryId]
  );

  const sections = useMemo(() => {
    const byDate = new Map<string, Expense[]>();
    for (const expense of history.items) {
      const list = byDate.get(expense.date);
      if (list) {
        list.push(expense);
      } else {
        byDate.set(expense.date, [expense]);
      }
    }
    return [...byDate.entries()].map(([date, data]) => ({
      title: sectionTitle(date),
      data,
    }));
  }, [history.items]);

  const selectFilter = (categoryId: string | null) => {
    setConfirmingDeleteId(null);
    router.setParams({ categoryId: categoryId ?? "" });
  };

  const handleDeletePress = (expense: Expense) => {
    if (confirmingDeleteId === expense.id) {
      deleteExpense(expense.id);
      setConfirmingDeleteId(null);
    } else {
      setConfirmingDeleteId(expense.id);
    }
  };

  return (
    <View className="flex-1 bg-white pt-6">
      <View className="px-5">
        <View className="flex-row items-end justify-between">
          <Text className="text-2xl font-bold text-gray-900">Historia</Text>
          <View className="items-end">
            <Text className="text-xs text-gray-500">W tym miesiącu</Text>
            <Text className="text-lg font-bold text-gray-900">
              {formatPln(monthSum)}
            </Text>
          </View>
        </View>

        {/* Chipsy filtra kategorii */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerClassName="gap-2 pr-5"
        >
          <Pressable
            onPress={() => selectFilter(null)}
            className={`rounded-full px-3.5 py-1.5 ${
              !activeCategoryId ? "bg-green-600" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                !activeCategoryId ? "text-white" : "text-gray-600"
              }`}
            >
              Wszystkie
            </Text>
          </Pressable>
          {categories.map((category) => {
            const isActive = category.id === activeCategoryId;
            return (
              <Pressable
                key={category.id}
                onPress={() => selectFilter(isActive ? null : category.id)}
                className={`rounded-full px-3.5 py-1.5 ${
                  isActive ? "bg-green-600" : "bg-gray-100"
                }`}
                accessibilityLabel={`Filtr ${category.name}`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isActive ? "text-white" : "text-gray-600"
                  }`}
                >
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {history.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : sections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 pb-16">
          <Text className="text-center text-base text-gray-500">
            {activeCategoryId
              ? "Brak wydatków w tej kategorii."
              : "Brak wydatków. Dodaj pierwszy na zakładce „Dziś”."}
          </Text>
        </View>
      ) : (
        <SectionList
          className="mt-2"
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          onEndReached={loadMoreHistory}
          onEndReachedThreshold={0.4}
          contentContainerClassName="px-5 pb-8"
          renderSectionHeader={({ section }) => (
            <Text className="mb-2 mt-4 text-sm font-semibold uppercase text-gray-400">
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <View className="mb-2.5">
              <ExpenseRow
                expense={item}
                category={categoryById[item.category_id]}
                onPress={() => {
                  if (!item.id.startsWith("temp-")) {
                    router.push({
                      pathname: "/add-expense",
                      params: { expenseId: item.id },
                    });
                  }
                }}
                isConfirmingDelete={confirmingDeleteId === item.id}
                onDeletePress={() => handleDeletePress(item)}
              />
            </View>
          )}
          ListFooterComponent={
            history.isLoadingMore ? (
              <ActivityIndicator
                className="py-4"
                size="small"
                color="#16a34a"
              />
            ) : !isPremium && !history.hasMore ? (
              // Koniec okna 3 miesięcy dla kont darmowych.
              <View className="mt-4 items-center rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5">
                <Ionicons name="lock-closed" size={22} color="#d97706" />
                <Text className="mt-2 text-center text-base font-semibold text-gray-900">
                  Starsze wydatki są zablokowane
                </Text>
                <Text className="mt-1 text-center text-sm text-gray-500">
                  W darmowym planie widzisz ostatnie 3 miesiące. Pełna
                  historia jest dostępna w Premium.
                </Text>
                <Pressable
                  onPress={() => router.push("/premium")}
                  className="mt-3 rounded-xl bg-green-600 px-5 py-2.5 active:bg-green-700"
                  accessibilityLabel="Odblokuj pełną historię"
                >
                  <Text className="text-sm font-semibold text-white">
                    Odblokuj pełną historię
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
