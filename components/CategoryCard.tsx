import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { categoryIcon } from "../lib/categoryIcons";
import { formatPln } from "../lib/format";
import type { Category } from "../types/database";

type CategoryCardProps = {
  category: Category;
  spent: number;
  onPress: () => void;
};

const progressColor = (ratio: number): string => {
  if (ratio > 0.9) {
    return "#ef4444"; // czerwony >90%
  }
  if (ratio >= 0.7) {
    return "#f59e0b"; // żółty 70–90%
  }
  return "#22c55e"; // zielony <70%
};

export function CategoryCard({ category, spent, onPress }: CategoryCardProps) {
  const limit = Number(category.monthly_limit);
  const ratio = limit > 0 ? spent / limit : spent > 0 ? 1 : 0;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 active:bg-gray-50"
      accessibilityLabel={`Kategoria ${category.name}, wydano ${formatPln(spent)} z ${formatPln(limit)}`}
    >
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-green-50">
          <Ionicons
            name={categoryIcon(category.icon)}
            size={20}
            color="#16a34a"
          />
        </View>
        <Text className="ml-3 flex-1 text-base font-semibold text-gray-900">
          {category.name}
        </Text>
        <Text className="text-sm text-gray-500">
          {formatPln(spent)} / {formatPln(limit)}
        </Text>
      </View>

      <View className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <View
          accessibilityLabel={`postęp ${category.name}`}
          style={{
            width: `${Math.min(ratio, 1) * 100}%`,
            backgroundColor: progressColor(ratio),
          }}
          className="h-full rounded-full"
        />
      </View>
    </Pressable>
  );
}
