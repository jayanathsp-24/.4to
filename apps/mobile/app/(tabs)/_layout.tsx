import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="spaces" options={{ title: "Spaces", tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="tree" options={{ title: "Tree", tabBarIcon: ({ color, size }) => <Ionicons name="images-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="feed" options={{ title: "Feed", tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="friends" options={{ title: "Friends", tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
