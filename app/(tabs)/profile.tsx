import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useAuth } from "../../lib/auth";
import { translateAuthError } from "../../lib/authErrors";
import { supabase } from "../../lib/supabase";

export default function ProfileScreen() {
  const { session } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    setErrorMessage(null);
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setErrorMessage(translateAuthError(error));
      }
      // Po wylogowaniu guard w root layoucie pokaże ekran logowania.
    } catch (error) {
      setErrorMessage(translateAuthError(error));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 py-8">
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-bold text-gray-900">Profil</Text>
        <Text className="mt-2 text-center text-base text-gray-500">
          Tu skonfigurujesz swoje budżety.
        </Text>
        {session?.user.email ? (
          <Text className="mt-4 text-sm text-gray-400">
            Zalogowano jako {session.user.email}
          </Text>
        ) : null}
      </View>

      {errorMessage ? (
        <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
          <Text className="text-sm text-red-700">{errorMessage}</Text>
        </View>
      ) : null}

      <Pressable
        className={`items-center rounded-xl py-3.5 ${
          isSigningOut ? "bg-red-400" : "bg-red-600 active:bg-red-700"
        }`}
        onPress={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-semibold text-white">
            Wyloguj się
          </Text>
        )}
      </Pressable>
    </View>
  );
}
