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

import { translateAuthError } from "../lib/authErrors";
import { supabase } from "../lib/supabase";

type Mode = "signIn" | "signUp";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignIn = mode === "signIn";

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const validate = (): string | null => {
    if (!EMAIL_REGEX.test(email.trim())) {
      return "Podaj poprawny adres e-mail.";
    }
    if (password.length < 6) {
      return "Hasło musi mieć co najmniej 6 znaków.";
    }
    return null;
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const credentials = { email: email.trim(), password };

      if (isSignIn) {
        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) {
          setErrorMessage(translateAuthError(error));
        }
        // Po sukcesie sesja zmienia się w AuthProviderze,
        // a guard w root layoucie przenosi do zakładek.
      } else {
        const { data, error } = await supabase.auth.signUp(credentials);
        if (error) {
          setErrorMessage(translateAuthError(error));
        } else if (!data.session) {
          // Projekt ma włączone potwierdzanie adresu e-mail.
          setInfoMessage(
            "Konto utworzone! Sprawdź skrzynkę e-mail i kliknij link, aby potwierdzić rejestrację."
          );
        }
      }
    } catch (error) {
      setErrorMessage(translateAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-10 items-center">
          <Text className="text-3xl font-bold text-gray-900">BudgetTrack</Text>
          <Text className="mt-2 text-base text-gray-500">
            Trzymaj budżet pod kontrolą
          </Text>
        </View>

        {/* Przełącznik trybu */}
        <View className="mb-8 flex-row rounded-xl bg-gray-100 p-1">
          <Pressable
            className={`flex-1 items-center rounded-lg py-2.5 ${
              isSignIn ? "bg-white shadow-sm" : ""
            }`}
            onPress={() => switchMode("signIn")}
            disabled={isSubmitting}
          >
            <Text
              className={`text-base font-semibold ${
                isSignIn ? "text-gray-900" : "text-gray-500"
              }`}
            >
              Zaloguj się
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-lg py-2.5 ${
              !isSignIn ? "bg-white shadow-sm" : ""
            }`}
            onPress={() => switchMode("signUp")}
            disabled={isSubmitting}
          >
            <Text
              className={`text-base font-semibold ${
                !isSignIn ? "text-gray-900" : "text-gray-500"
              }`}
            >
              Zarejestruj się
            </Text>
          </Pressable>
        </View>

        <View className="gap-4">
          <View>
            <Text className="mb-1.5 text-sm font-medium text-gray-700">
              E-mail
            </Text>
            <TextInput
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
              value={email}
              onChangeText={setEmail}
              placeholder="twoj@email.pl"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!isSubmitting}
            />
          </View>

          <View>
            <Text className="mb-1.5 text-sm font-medium text-gray-700">
              Hasło
            </Text>
            <TextInput
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
              value={password}
              onChangeText={setPassword}
              placeholder="min. 6 znaków"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoCapitalize="none"
              autoComplete={isSignIn ? "current-password" : "new-password"}
              editable={!isSubmitting}
            />
          </View>

          {errorMessage ? (
            <View className="rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{errorMessage}</Text>
            </View>
          ) : null}

          {infoMessage ? (
            <View className="rounded-xl bg-green-50 px-4 py-3">
              <Text className="text-sm text-green-700">{infoMessage}</Text>
            </View>
          ) : null}

          <Pressable
            className={`mt-2 items-center rounded-xl py-3.5 ${
              isSubmitting ? "bg-green-400" : "bg-green-600 active:bg-green-700"
            }`}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                {isSignIn ? "Zaloguj się" : "Utwórz konto"}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
