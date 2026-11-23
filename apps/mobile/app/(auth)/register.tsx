import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Brand } from "../../components/Brand";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const availability = /^[a-zA-Z0-9_]{3,30}$/.test(username) ? "Username format looks available" : "";

  return (
    <View style={styles.page}>
      <Brand />
      <Text style={styles.title}>Create your account</Text>
      <TextInput style={styles.input} placeholder="Display name" placeholderTextColor={colors.textMuted} value={displayName} onChangeText={setDisplayName} />
      <TextInput style={styles.input} placeholder="@username" placeholderTextColor={colors.textMuted} value={username} onChangeText={(v) => setUsername(v.replace("@", "").toLowerCase())} autoCapitalize="none" />
      {availability ? <Text style={styles.available}>{availability}</Text> : null}
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password (8+ characters)" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable style={styles.primary} onPress={() => router.replace("/(tabs)/spaces")}><Text style={styles.primaryText}>Continue</Text></Pressable>
      <Pressable onPress={() => router.back()}><Text style={styles.link}>Already have an account?</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center", gap: 12 },
  title: { ...typography.title, color: colors.text, textAlign: "center", marginVertical: 12 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 16 },
  primary: { height: 48, borderRadius: 12, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  primaryText: { ...typography.body, color: colors.bg, fontWeight: "700" },
  link: { ...typography.body, color: colors.lime, textAlign: "center", marginTop: 12 },
  available: { ...typography.caption, color: colors.lime },
});
