import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export function Loading() {
  return <View style={styles.center}><ActivityIndicator color={colors.lime} /><Text style={styles.muted}>Loading…</Text></View>;
}

export function Empty({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.center}><Text style={styles.title}>{title}</Text>{action && <Pressable style={styles.button} onPress={onAction}><Text style={styles.buttonText}>{action}</Text></Pressable>}</View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View style={styles.center}><Text style={styles.error}>{message}</Text><Pressable style={styles.button} onPress={onRetry}><Text style={styles.buttonText}>Try again</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, minHeight: 180, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  muted: { ...typography.caption, color: colors.textMuted },
  title: { ...typography.title, color: colors.text, textAlign: "center" },
  error: { ...typography.body, color: colors.danger, textAlign: "center" },
  button: { height: 48, minWidth: 180, borderRadius: 12, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  buttonText: { ...typography.body, color: colors.bg, fontWeight: "700" },
});
