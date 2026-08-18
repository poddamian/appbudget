import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";

import { AuthProvider, useAuth } from "../lib/auth";
import { ExpensesProvider } from "../lib/expenses";

import "../global.css";

function RootNavigator() {
  const { session, isLoading, onboardingCompleted, isOnboardingLoading } =
    useAuth();

  if (isLoading || (session && isOnboardingLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const isSignedIn = !!session;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn && onboardingCompleted}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add-expense"
          options={{ presentation: "modal", gestureEnabled: true }}
        />
      </Stack.Protected>
      <Stack.Protected guard={isSignedIn && !onboardingCompleted}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ExpensesProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </ExpensesProvider>
    </AuthProvider>
  );
}
