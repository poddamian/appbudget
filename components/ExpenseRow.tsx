import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { categoryIcon } from "../lib/categoryIcons";
import { formatPln } from "../lib/format";
import type { Category, Expense } from "../types/database";

type ExpenseRowProps = {
  expense: Expense;
  category: Category | undefined;
  onPress: () => void;
  /** czy pokazać drugi krok potwierdzenia usunięcia */
  isConfirmingDelete: boolean;
  onDeletePress: () => void;
};

export function ExpenseRow({
  expense,
  category,
  onPress,
  isConfirmingDelete,
  onDeletePress,
}: ExpenseRowProps) {
  const renderRightActions = () => (
    <Pressable
      onPress={onDeletePress}
      className={`ml-2 w-24 items-center justify-center rounded-xl ${
        isConfirmingDelete ? "bg-red-700" : "bg-red-600"
      }`}
      accessibilityLabel={
        isConfirmingDelete
          ? `Potwierdź usunięcie wydatku ${formatPln(Number(expense.amount))}`
          : `Usuń wydatek ${formatPln(Number(expense.amount))}`
      }
    >
      <Ionicons
        name={isConfirmingDelete ? "alert-circle" : "trash"}
        size={18}
        color="#ffffff"
      />
      <Text className="mt-0.5 text-xs font-semibold text-white">
        {isConfirmingDelete ? "Na pewno?" : "Usuń"}
      </Text>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <Pressable
        onPress={onPress}
        className="flex-row items-center rounded-xl border border-gray-200 bg-white px-4 py-3 active:bg-gray-50"
        accessibilityLabel={`Wydatek ${category?.name ?? ""} ${formatPln(Number(expense.amount))}`}
      >
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
          </Text>
          {expense.note ? (
            <Text className="mt-0.5 text-sm text-gray-500" numberOfLines={1}>
              {expense.note}
            </Text>
          ) : null}
        </View>
        <Text className="text-base font-semibold text-gray-900">
          {formatPln(Number(expense.amount))}
        </Text>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
