import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
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

import { useAuth } from "../lib/auth";
import { categoryIcon } from "../lib/categoryIcons";
import { formatPln, parseAmount } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { Category } from "../types/database";

export default function OnboardingScreen() {
  const { session, completeOnboarding } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");

      if (cancelled) {
        return;
      }

      if (error) {
        setErrorMessage(
          "Nie udało się pobrać kategorii. Sprawdź połączenie i spróbuj ponownie."
        );
      } else {
        setCategories(data);
        setLimits(
          Object.fromEntries(
            data.map((category) => [
              category.id,
              String(category.monthly_limit),
            ])
          )
        );
      }
      setIsFetching(false);
    };

    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const total = useMemo(
    () =>
      categories.reduce((sum, category) => {
        const parsed = parseAmount(limits[category.id] ?? "");
        return sum + (Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
      }, 0),
    [categories, limits]
  );

  const handleSave = async () => {
    setErrorMessage(null);

    const invalid = categories.find((category) => {
      const parsed = parseAmount(limits[category.id] ?? "");
      return !Number.isFinite(parsed) || parsed < 0;
    });
    if (invalid) {
      setErrorMessage(
        `Limit dla kategorii „${invalid.name}" musi być liczbą większą lub równą 0.`
      );
      return;
    }

    setIsSaving(true);
    try {
      const results = await Promise.all(
        categories.map((category) =>
          supabase
            .from("categories")
            .update({ monthly_limit: parseAmount(limits[category.id]) })
            .eq("id", category.id)
        )
      );

      const failed = results.find((result) => result.error);
      if (failed?.error) {
        setErrorMessage(
          "Nie udało się zapisać limitów. Sprawdź połączenie i spróbuj ponownie."
        );
        return;
      }

      // Guard w root layoucie przeniesie do zakładek (ekran „Dziś").
      await completeOnboarding();
    } catch {
      setErrorMessage(
        "Nie udało się zapisać limitów. Sprawdź połączenie i spróbuj ponownie."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (step === 1) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <Ionicons name="wallet" size={40} color="#16a34a" />
        </View>
        <Text className="text-center text-3xl font-bold text-gray-900">
          Zobacz, ile realnie możesz wydać
        </Text>
        <Text className="mt-3 text-center text-base text-gray-500">
          Ustaw miesięczne limity dla swoich kategorii
          {session?.user.email ? ` — witaj, ${session.user.email}` : ""}.
        </Text>
        <Pressable
          className="mt-10 w-full items-center rounded-xl bg-green-600 py-3.5 active:bg-green-700"
          onPress={() => setStep(2)}
        >
          <Text className="text-base font-semibold text-white">
            Ustaw budżet
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 px-6 pt-16">
        <Text className="text-2xl font-bold text-gray-900">
          Twoje miesięczne limity
        </Text>
        <Text className="mt-1 text-base text-gray-500">
          Możesz je zmienić w każdej chwili w zakładce Profil.
        </Text>

        {isFetching ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : (
          <ScrollView
            className="mt-6 flex-1"
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-3 pb-4">
              {categories.map((category) => (
                <View
                  key={category.id}
                  className="flex-row items-center rounded-xl border border-gray-200 bg-white px-4 py-3"
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
                  <TextInput
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-right text-base text-gray-900"
                    value={limits[category.id] ?? ""}
                    onChangeText={(value) =>
                      setLimits((current) => ({
                        ...current,
                        [category.id]: value,
                      }))
                    }
                    keyboardType="decimal-pad"
                    editable={!isSaving}
                  />
                  <Text className="ml-2 text-base text-gray-500">zł</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <View className="border-t border-gray-200 py-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-base font-medium text-gray-700">
              Łącznie miesięcznie
            </Text>
            <Text className="text-xl font-bold text-gray-900">
              {formatPln(total)}
            </Text>
          </View>

          {errorMessage ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            className={`items-center rounded-xl py-3.5 ${
              isSaving || isFetching
                ? "bg-green-400"
                : "bg-green-600 active:bg-green-700"
            }`}
            onPress={handleSave}
            disabled={isSaving || isFetching}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">Gotowe</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
