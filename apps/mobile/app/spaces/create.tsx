import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export default function CreateSpaceScreen() {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("2026-12-01");
  const [end, setEnd] = useState("2026-12-05");
  return (
    <View style={styles.page}>
      <Text style={styles.heading}>New Space</Text>
      <TextInput style={styles.input} placeholder="Space name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Unique username (e.g. bali_trip)" placeholderTextColor={colors.textMuted} value={handle} onChangeText={(value) => setHandle(value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} autoCapitalize="none" />
      <Text style={styles.hint}>Friends can find it as @{handle || "your_space"}.</Text>
      <TextInput style={[styles.input, styles.textarea]} placeholder="Description (optional)" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline />
      <Text style={styles.label}>Start date</Text><TextInput style={styles.input} value={start} onChangeText={setStart} placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>End date</Text><TextInput style={styles.input} value={end} onChangeText={setEnd} placeholderTextColor={colors.textMuted} />
      <Pressable style={styles.primary} onPress={() => router.back()}><Text style={styles.primaryText}>Create Space</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 },
  heading: { ...typography.heading, color: colors.text, marginBottom: 4 },
  label: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 16 },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: -6 },
  textarea: { height: 96, paddingTop: 14 },
  primary: { height: 48, borderRadius: 12, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", marginTop: 12 },
  primaryText: { ...typography.body, color: colors.bg, fontWeight: "700" },
});
