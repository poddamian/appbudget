import AsyncStorage from "@react-native-async-storage/async-storage";

// Flaga jest per użytkownik — na wspólnym urządzeniu drugie konto
// też powinno przejść swój onboarding.
const storageKey = (userId: string) => `onboarding_completed:${userId}`;

export async function isOnboardingCompleted(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(storageKey(userId))) === "true";
  } catch {
    return false;
  }
}

export async function markOnboardingCompleted(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), "true");
  } catch {
    // Brak zapisu flagi nie może blokować wejścia do aplikacji;
    // najwyżej onboarding pokaże się jeszcze raz.
  }
}
