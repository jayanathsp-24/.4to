import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Brand } from "../../components/Brand";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [totpCode, setTotpCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState("");

  function signIn() {
    if (!email || password.length < 8) {
      setError("Enter an email and a password of at least 8 characters.");
      return;
    }
    setError("");
    // If demo or 2FA account, prompt 2FA step
    setStep("2fa");
  }

  function verify2FA() {
    const code = useBackupCode ? backupCode.trim() : totpCode.trim();
    if (!code) {
      setError("Please enter a verification code");
      return;
    }
    if (!useBackupCode && code.length !== 6) {
      setError("Authenticator code must be 6 digits");
      return;
    }
    setError("");
    router.replace("/(tabs)/spaces");
  }

  return (
    <View style={styles.page}>
      <Brand />
      <Text style={styles.tagline}>Every photo. Every friend. Full quality.</Text>

      {step === "credentials" ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.primary} onPress={signIn}>
            <Text style={styles.primaryText}>Log in</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(auth)/register")}>
            <Text style={styles.link}>Create an account</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.twoFactorBox}>
          <Text style={styles.twoFactorBadge}>🔐 TWO-FACTOR AUTHENTICATION</Text>
          <Text style={styles.twoFactorTitle}>Security Verification</Text>
          <Text style={styles.twoFactorDesc}>
            {useBackupCode
              ? "Enter one of your 8-character single-use emergency recovery codes:"
              : "Enter the 6-digit code from your authenticator app:"}
          </Text>

          {useBackupCode ? (
            <TextInput
              style={styles.input}
              placeholder="e.g. 8f2a-9c01"
              placeholderTextColor={colors.textMuted}
              value={backupCode}
              onChangeText={setBackupCode}
              autoCapitalize="none"
              autoFocus
            />
          ) : (
            <TextInput
              style={[styles.input, styles.totpInput]}
              placeholder="000000"
              placeholderTextColor={colors.textMuted}
              value={totpCode}
              onChangeText={(t) => setTotpCode(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          )}

          <Pressable onPress={() => { setUseBackupCode(!useBackupCode); setError(""); }}>
            <Text style={styles.link}>
              {useBackupCode ? "Use Authenticator Code" : "Use a backup recovery code"}
            </Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primary} onPress={verify2FA}>
            <Text style={styles.primaryText}>Verify & Sign In</Text>
          </Pressable>

          <Pressable onPress={() => { setStep("credentials"); setError(""); }}>
            <Text style={[styles.link, { color: colors.textMuted }]}>← Back to Password</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center", gap: 12 },
  tagline: { ...typography.body, color: colors.textMuted, textAlign: "center", marginBottom: 24 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 16 },
  primary: { height: 48, borderRadius: 12, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", marginTop: 8 },
  primaryText: { ...typography.body, color: colors.bg, fontWeight: "700" },
  link: { ...typography.caption, color: colors.lime, textAlign: "center", marginTop: 8, fontWeight: "600" },
  error: { ...typography.caption, color: colors.danger, textAlign: "center" },

  twoFactorBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  twoFactorBadge: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  twoFactorTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: "center",
  },
  twoFactorDesc: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  totpInput: {
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 8,
    color: colors.lime,
    borderWidth: 2,
    borderColor: colors.lime,
  },
});
