import { Text, View } from "react-native";

type ScreenPlaceholderProps = {
  title: string;
  subtitle?: string;
};

export function ScreenPlaceholder({ title, subtitle }: ScreenPlaceholderProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-gray-900">{title}</Text>
      {subtitle ? (
        <Text className="mt-2 text-center text-base text-gray-500">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
