import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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
import { formatPln, parseAmount } from "../lib/format";
import { useSettings } from "../lib/settings";

const FREE_CATEGORY_LIMIT = 6;

export default function ManageCategoriesScreen() {
  const router = useRouter();
  const { categories, updateCategory, addCategory } = useExpenses();
  const { settings } = useSettings();
  const isPremium = settings?.is_premium ?? false;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLimit, setEditLimit] = useState("");

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [isSavingNew, setIsSavingNew] = useState(false);

  const [showPaywall, setShowPaywall] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startEditing = (id: string) => {
    const category = categories.find((c) => c.id === id);
    if (!category) {
      return;
    }
    setErrorMessage(null);
    setIsAdding(false);
    setEditingId(id);
    setEditName(category.name);
    setEditLimit(String(category.monthly_limit).replace(".", ","));
  };

  const validate = (name: string, limitText: string): string | null => {
    if (!name.trim()) {
      return "Nazwa kategorii nie może być pusta.";
    }
    const limit = parseAmount(limitText);
    if (!Number.isFinite(limit) || limit < 0) {
      return "Limit musi być liczbą większą lub równą 0.";
    }
    return null;
  };

  const saveEdit = () => {
    if (!editingId) {
      return;
    }
    const validationError = validate(editName, editLimit);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    updateCategory(editingId, {
      name: editName,
      monthlyLimit: parseAmount(editLimit),
    });
    setEditingId(null);
    setErrorMessage(null);
  };

  const handleAddPress = () => {
    setErrorMessage(null);
    setEditingId(null);
    if (!isPremium && categories.length >= FREE_CATEGORY_LIMIT) {
      setShowPaywall(true);
      return;
    }
    setIsAdding(true);
    setNewName("");
    setNewLimit("");
  };

  const saveNew = async () => {
    const validationError = validate(newName, newLimit);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setIsSavingNew(true);
    const error = await addCategory(newName, parseAmount(newLimit));
    setIsSavingNew(false);
    if (error) {
      setErrorMessage(error);
    } else {
      setIsAdding(false);
      setErrorMessage(null);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-row items-center px-5 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          accessibilityLabel="Wróć"
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </Pressable>
        <Text className="ml-3 text-lg font-semibold text-gray-900">
          Kategorie
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-5 pb-8 pt-4"
      >
        <Text className="mb-3 text-sm text-gray-500">
          Tap na kategorię, aby zmienić nazwę lub miesięczny limit.
        </Text>

        {categories.map((category) => {
          const isEditing = editingId === category.id;
          return (
            <View key={category.id} className="mb-3">
              <Pressable
                onPress={() => startEditing(category.id)}
                className={`flex-row items-center rounded-xl border px-4 py-3 ${
                  isEditing
                    ? "border-green-600 bg-green-50"
                    : "border-gray-200 bg-white active:bg-gray-50"
                }`}
                accessibilityLabel={`Edytuj kategorię ${category.name}`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-green-50">
                  <Ionicons
                    name={categoryIcon(category.icon)}
                    size={20}
                    color="#16a34a"
                  />
                </View>
                <Text className="ml-3 flex-1 text-base font-medium text-gray-900">
                  {category.name}
                </Text>
                <Text className="text-sm text-gray-500">
                  {formatPln(Number(category.monthly_limit))}
                </Text>
              </Pressable>

              {isEditing ? (
                <View className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <Text className="mb-1 text-sm font-medium text-gray-700">
                    Nazwa
                  </Text>
                  <TextInput
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900"
                    value={editName}
                    onChangeText={setEditName}
                    accessibilityLabel="Nazwa kategorii"
                  />
                  <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">
                    Miesięczny limit (zł)
                  </Text>
                  <TextInput
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900"
                    value={editLimit}
                    onChangeText={setEditLimit}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Limit kategorii"
                  />
                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      onPress={saveEdit}
                      className="flex-1 items-center rounded-lg bg-green-600 py-2.5 active:bg-green-700"
                    >
                      <Text className="font-semibold text-white">Zapisz</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setEditingId(null)}
                      className="flex-1 items-center rounded-lg bg-gray-200 py-2.5 active:bg-gray-300"
                    >
                      <Text className="font-semibold text-gray-700">
                        Anuluj
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}

        {isAdding ? (
          <View className="mt-2 rounded-xl border border-green-600 bg-green-50 p-4">
            <Text className="text-base font-semibold text-gray-900">
              Nowa kategoria
            </Text>
            <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">
              Nazwa
            </Text>
            <TextInput
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900"
              value={newName}
              onChangeText={setNewName}
              placeholder="np. Wakacje"
              placeholderTextColor="#9ca3af"
              accessibilityLabel="Nazwa nowej kategorii"
            />
            <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">
              Miesięczny limit (zł)
            </Text>
            <TextInput
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900"
              value={newLimit}
              onChangeText={setNewLimit}
              keyboardType="decimal-pad"
              placeholder="np. 500"
              placeholderTextColor="#9ca3af"
              accessibilityLabel="Limit nowej kategorii"
            />
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={saveNew}
                disabled={isSavingNew}
                className="flex-1 items-center rounded-lg bg-green-600 py-2.5 active:bg-green-700"
              >
                {isSavingNew ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="font-semibold text-white">Dodaj</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => setIsAdding(false)}
                className="flex-1 items-center rounded-lg bg-gray-200 py-2.5 active:bg-gray-300"
              >
                <Text className="font-semibold text-gray-700">Anuluj</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={handleAddPress}
            className="mt-2 flex-row items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-3.5 active:bg-gray-50"
            accessibilityLabel="Dodaj kategorię"
          >
            <Ionicons name="add" size={20} color="#16a34a" />
            <Text className="ml-1 text-base font-semibold text-green-700">
              Dodaj kategorię
            </Text>
          </Pressable>
        )}

        {errorMessage ? (
          <View className="mt-4 rounded-xl bg-red-50 px-4 py-3">
            <Text className="text-sm text-red-700">{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Paywall dla darmowych kont przy próbie dodania 7. kategorii */}
      {showPaywall ? (
        <View className="absolute inset-0 items-center justify-end bg-black/40 px-5 pb-10">
          <View className="w-full rounded-2xl bg-white p-6">
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Ionicons name="lock-open" size={24} color="#d97706" />
            </View>
            <Text className="text-xl font-bold text-gray-900">
              Odblokuj więcej kategorii z Premium
            </Text>
            <Text className="mt-2 text-base text-gray-500">
              W darmowym planie masz 6 kategorii. Z Premium dodasz ich tyle,
              ile potrzebujesz — plus pełna historia i eksport do CSV.
            </Text>
            <Pressable
              onPress={() => {
                setShowPaywall(false);
                router.push("/premium");
              }}
              className="mt-5 items-center rounded-xl bg-green-600 py-3.5 active:bg-green-700"
            >
              <Text className="text-base font-semibold text-white">
                Zobacz Premium
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowPaywall(false)}
              className="mt-2 items-center rounded-xl py-3"
            >
              <Text className="text-base font-medium text-gray-500">
                Nie teraz
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
