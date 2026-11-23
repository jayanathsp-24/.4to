import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="spaces/create" options={{ title: "Create Space" }} />
        <Stack.Screen name="spaces/[id]" options={{ title: "Space" }} />
        <Stack.Screen name="spaces/add/[id]" options={{ title: "Add photos" }} />
        <Stack.Screen name="tree/branch" options={{ title: "Branch" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
