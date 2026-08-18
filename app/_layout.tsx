import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "../lib/auth";
import { ExpensesProvider } from "../lib/expenses";
import { configureNotifications } from "../lib/notifications";
import { SettingsProvider } from "../lib/settings";

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
        <Stack.Screen name="manage-categories" />
        <Stack.Screen name="premium" />
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
  useEffect(() => {
    configureNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SettingsProvider>
          <ExpensesProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </ExpensesProvider>
        </SettingsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
