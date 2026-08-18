import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

import type { Database } from "../types/database";

// Podczas statycznego renderu webowego (SSR) nie ma window ani storage.
const isServer = Platform.OS === "web" && typeof window === "undefined";

let supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
let supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase: brak EXPO_PUBLIC_SUPABASE_URL lub EXPO_PUBLIC_SUPABASE_ANON_KEY w zmiennych środowiskowych (.env)."
  );
  // Placeholder pozwala aplikacji wystartować bez konfiguracji —
  // zapytania do Supabase będą wtedy kończyć się błędem sieci.
  supabaseUrl = supabaseUrl || "https://placeholder.supabase.co";
  supabaseAnonKey = supabaseAnonKey || "placeholder-anon-key";
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Na webie zostaje domyślny localStorage, natywnie AsyncStorage.
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});

export type {
  Database,
  Category,
  CategoryInsert,
  CategoryUpdate,
  Expense,
  ExpenseInsert,
  ExpenseUpdate,
  UserSettings,
  UserSettingsInsert,
  UserSettingsUpdate,
} from "../types/database";
