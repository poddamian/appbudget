import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { categoryIcon } from "../lib/categoryIcons";
import { useExpenses } from "../lib/expenses";
import { parseAmount } from "../lib/format";

export default function AddExpenseScreen() {
  const router = useRouter();
  const { expenseId } = useLocalSearchParams<{ expenseId?: string }>();
  const { categories, addExpense, updateExpense, getExpenseById } =
    useExpenses();

  // Tryb edycji: ten sam modal, wypełniony danymi istniejącego wydatku.
  const editedExpense = expenseId ? getExpenseById(expenseId) : undefined;
  const isEditing = !!editedExpense;

  const [amount, setAmount] = useState(
    editedExpense ? String(editedExpense.amount).replace(".", ",") : ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    editedExpense?.category_id ?? null
  );
  const [note, setNote] = useState(editedExpense?.note ?? "");
  const [isNoteVisible, setIsNoteVisible] = useState(!!editedExpense?.note);

  const parsedAmount = parseAmount(amount);
  const canSave =
    Number.isFinite(parsedAmount) && parsedAmount > 0 && !!selectedCategoryId;

  const handleSave = () => {
    if (!canSave || !selectedCategoryId) {
      return;
    }

    // Optymistycznie: modal zamyka się od razu, zapis leci w tle.
    if (isEditing && editedExpense) {
      updateExpense(editedExpense.id, {
        categoryId: selectedCategoryId,
        amount: parsedAmount,
        note,
      });
    } else {
      addExpense({
        categoryId: selectedCategoryId,
        amount: parsedAmount,
        note,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    router.back();
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-row items-center justify-between px-5 pt-4">
        <Text className="text-lg font-semibold text-gray-900">
          {isEditing ? "Edytuj wydatek" : "Nowy wydatek"}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          accessibilityLabel="Zamknij"
        >
          <Ionicons name="close" size={20} color="#374151" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-5 pb-4"
      >
        {/* Kwota — duże pole, klawiatura numeryczna otwarta od razu */}
        <View className="mt-4 flex-row items-end justify-center">
          <TextInput
            className="min-w-[120px] text-center text-5xl font-bold text-gray-900"
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor="#d1d5db"
            keyboardType="decimal-pad"
            autoFocus
            maxLength={9}
          />
          <Text className="pb-2 text-2xl font-semibold text-gray-400">zł</Text>
        </View>

        {/* Siatka kategorii — jeden tap wybiera */}
        <View className="mt-6 flex-row flex-wrap justify-between">
          {categories.map((category) => {
            const isSelected = category.id === selectedCategoryId;
            return (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategoryId(category.id)}
                className={`mb-3 w-[31%] items-center rounded-2xl border px-2 py-3 ${
                  isSelected
                    ? "border-green-600 bg-green-50"
                    : "border-gray-200 bg-white active:bg-gray-50"
                }`}
                accessibilityLabel={`Kategoria ${category.name}`}
              >
                <Ionicons
                  name={categoryIcon(category.icon)}
                  size={24}
                  color={isSelected ? "#16a34a" : "#6b7280"}
                />
                <Text
                  numberOfLines={1}
                  className={`mt-1.5 text-sm font-medium ${
                    isSelected ? "text-green-700" : "text-gray-700"
                  }`}
                >
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Notatka — domyślnie schowana */}
        {isNoteVisible ? (
          <TextInput
            className="mt-1 rounded-xl border border-gray-300 px-4 py-2.5 text-base text-gray-900"
            value={note}
            onChangeText={setNote}
            placeholder="Notatka (opcjonalnie)"
            placeholderTextColor="#9ca3af"
            autoFocus
          />
        ) : (
          <Pressable
            onPress={() => setIsNoteVisible(true)}
            className="mt-1 self-start py-1"
          >
            <Text className="text-sm font-medium text-green-700">
              + dodaj notatkę
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <View className="border-t border-gray-100 px-5 pb-8 pt-3">
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          className={`items-center rounded-xl py-3.5 ${
            canSave ? "bg-green-600 active:bg-green-700" : "bg-gray-200"
          }`}
        >
          <Text
            className={`text-base font-semibold ${
              canSave ? "text-white" : "text-gray-400"
            }`}
          >
            Zapisz
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
