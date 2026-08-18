import type { Ionicons } from "@expo/vector-icons";

export type IoniconName = keyof typeof Ionicons.glyphMap;

// Kategorie w bazie mają nazwy ikon w konwencji lucide —
// mapujemy je na najbliższe odpowiedniki z Ionicons.
const ICON_MAP: Record<string, IoniconName> = {
  utensils: "restaurant",
  car: "car",
  home: "home",
  "gamepad-2": "game-controller",
  "heart-pulse": "heart",
  shapes: "shapes",
};

export const categoryIcon = (icon: string): IoniconName =>
  ICON_MAP[icon] ?? "pricetag";
