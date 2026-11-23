import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { Card } from "../../components/Card";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export default function ProfileScreen() {
  // User profile state
  const [profile, setProfile] = useState({
    name: "Alex Morgan",
    username: "alex",
    email: "alex@example.com",
    bio: "Explorer, photographer & archivist of uncompressed memories.",
  });

  // Draft state for Settings modal
  const [draftName, setDraftName] = useState(profile.name);
  const [draftUsername, setDraftUsername] = useState(profile.username);
  const [draftEmail, setDraftEmail] = useState(profile.email);
  const [draftBio, setDraftBio] = useState(profile.bio);

  // Active modal state
  const [activeModal, setActiveModal] = useState<"none" | "settings" | "notifications" | "privacy" | "2fa">("none");

  // Two-Factor Authentication State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<"qr" | "verify" | "backup">("qr");
  const [totpSetupCode, setTotpSetupCode] = useState("");
  const [totpError, setTotpError] = useState("");
  const secretKey = "4TO7-K8M9-X2PW-4N1Q";
  const backupCodes = ["8f2a-9c01", "4d7e-11b9", "e3a5-78c2", "99b1-0f44", "2c88-51da", "7fe3-66d0"];

  // Notifications state
  const [notifications, setNotifications] = useState({
    spaceInvites: true,
    photoUploads: true,
    reminders: true,
    chatMessages: true,
  });

  // Privacy state
  const [privacy, setPrivacy] = useState({
    stripGps: true,
    privateTree: true,
    discoverable: true,
    requireApproval: false,
  });

  const openSettings = () => {
    setDraftName(profile.name);
    setDraftUsername(profile.username);
    setDraftEmail(profile.email);
    setDraftBio(profile.bio);
    setActiveModal("settings");
  };

  const saveSettings = () => {
    setProfile({
      name: draftName.trim() || profile.name,
      username: draftUsername.trim().replace(/^@/, "") || profile.username,
      email: draftEmail.trim() || profile.email,
      bio: draftBio.trim(),
    });
    setActiveModal("none");
  };

  const handleSignOut = () => {
    Alert.alert(
      "Log out of 4to?",
      "Your evolutionary photo tree and spaces will remain securely stored in your private vault.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: () => router.replace("/(auth)/login"),
        },
      ]
    );
  };

  const handleExport = () => {
    Alert.alert(
      "Export Archive Ready",
      "An uncompressed ZIP archive containing all 142 original photos (1.8 GB) has been queued for download."
    );
  };

  const copySecretKey = async () => {
    await Clipboard.setStringAsync(secretKey);
    Alert.alert("Copied to Clipboard", "Manual 2FA setup key copied.");
  };

  const copyBackupCodes = async () => {
    await Clipboard.setStringAsync(backupCodes.join("\n"));
    Alert.alert("Copied", "All 6 emergency recovery codes copied to clipboard.");
  };

  const verifyAndEnable2FA = () => {
    if (totpSetupCode.trim().length !== 6) {
      setTotpError("Enter a valid 6-digit authenticator code");
      return;
    }
    setTotpError("");
    setTwoFactorEnabled(true);
    setTwoFactorStep("backup");
  };

  return (
    <View style={styles.page}>
      <Text style={styles.heading}>Profile</Text>

      {/* Main Profile Card */}
      <Card>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.initial}>{profile.name.charAt(0)}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.detail}>@{profile.username} · {profile.email}</Text>
            {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
          </View>
        </View>

        {/* Storage Bar */}
        <View style={styles.storageSection}>
          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>Vault Storage (Free Tier)</Text>
            <Text style={styles.storageValue}>1.8 GB / 5 GB</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "36%" }]} />
          </View>
          <Text style={styles.storageCaption}>Zero Compression · Original Quality</Text>
        </View>
      </Card>

      {/* Profile Menu Rows */}
      <Pressable style={styles.row} onPress={openSettings}>
        <View style={styles.rowContent}>
          <Text style={styles.rowIcon}>⚙</Text>
          <View>
            <Text style={styles.rowText}>Settings</Text>
            <Text style={styles.rowSubtext}>Name, username, email & profile bio</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => setActiveModal("notifications")}>
        <View style={styles.rowContent}>
          <Text style={styles.rowIcon}>🔔</Text>
          <View>
            <Text style={styles.rowText}>Notifications</Text>
            <Text style={styles.rowSubtext}>Invites, uploads & contribution alerts</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => setActiveModal("privacy")}>
        <View style={styles.rowContent}>
          <Text style={styles.rowIcon}>🛡</Text>
          <View>
            <Text style={styles.rowText}>Privacy & security</Text>
            <Text style={styles.rowSubtext}>2FA authentication, GPS stripping & vault</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={handleSignOut}>
        <View style={styles.rowContent}>
          <Text style={[styles.rowIcon, { color: colors.danger }]}>⎋</Text>
          <View>
            <Text style={styles.danger}>Log out</Text>
            <Text style={styles.rowSubtext}>End active session on this device</Text>
          </View>
        </View>
        <Text style={[styles.chevron, { color: colors.danger }]}>›</Text>
      </Pressable>

      {/* ── Settings Modal ── */}
      <Modal
        visible={activeModal === "settings"}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActiveModal("none")}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSubheading}>Preferences</Text>
                <Text style={styles.modalTitle}>Account Settings</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setActiveModal("none")}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={draftUsername}
                  onChangeText={setDraftUsername}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={draftEmail}
                  onChangeText={setDraftEmail}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={draftBio}
                  onChangeText={setDraftBio}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.themeCard}>
                <Text style={styles.themeCardTitle}>Active Theme</Text>
                <Text style={styles.themeCardSubtitle}>Antigravity Dark with Electric Lime accents</Text>
              </View>

              <Pressable style={styles.primaryActionBtn} onPress={saveSettings}>
                <Text style={styles.primaryActionBtnText}>Save Changes</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Notifications Modal ── */}
      <Modal
        visible={activeModal === "notifications"}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActiveModal("none")}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSubheading}>Alerts & Feeds</Text>
                <Text style={styles.modalTitle}>Notification Preferences</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setActiveModal("none")}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Space Invitations</Text>
                  <Text style={styles.switchDesc}>When friends invite you to a Photo Space</Text>
                </View>
                <Switch
                  value={notifications.spaceInvites}
                  onValueChange={(val) => setNotifications((p) => ({ ...p, spaceInvites: val }))}
                  trackColor={{ false: colors.surface2, true: colors.lime }}
                  thumbColor={colors.bg}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>New Photo Uploads</Text>
                  <Text style={styles.switchDesc}>When members add photos to your shared spaces</Text>
                </View>
                <Switch
                  value={notifications.photoUploads}
                  onValueChange={(val) => setNotifications((p) => ({ ...p, photoUploads: val }))}
                  trackColor={{ false: colors.surface2, true: colors.lime }}
                  thumbColor={colors.bg}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Contribution Reminders</Text>
                  <Text style={styles.switchDesc}>Before a space upload window closes</Text>
                </View>
                <Switch
                  value={notifications.reminders}
                  onValueChange={(val) => setNotifications((p) => ({ ...p, reminders: val }))}
                  trackColor={{ false: colors.surface2, true: colors.lime }}
                  thumbColor={colors.bg}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Chat & Messages</Text>
                  <Text style={styles.switchDesc}>Comments and chat messages inside spaces</Text>
                </View>
                <Switch
                  value={notifications.chatMessages}
                  onValueChange={(val) => setNotifications((p) => ({ ...p, chatMessages: val }))}
                  trackColor={{ false: colors.surface2, true: colors.lime }}
                  thumbColor={colors.bg}
                />
              </View>

              <Pressable
                style={styles.feedShortcutBtn}
                onPress={() => {
                  setActiveModal("none");
                  router.push("/notifications");
                }}
              >
                <Text style={styles.feedShortcutBtnText}>Open Notifications Feed →</Text>
              </Pressable>

              <Pressable style={styles.primaryActionBtn} onPress={() => setActiveModal("none")}>
                <Text style={styles.primaryActionBtnText}>Done</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Privacy & Security Modal ── */}
      <Modal
        visible={activeModal === "privacy"}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActiveModal("none")}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSubheading}>Data & Protection</Text>
                <Text style={styles.modalTitle}>Privacy & Security</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setActiveModal("none")}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* 2FA Security Card */}
              <View style={styles.twoFactorCard}>
                <View style={styles.twoFactorHeader}>
                  <Text style={styles.twoFactorIcon}>🔐</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.twoFactorTitle}>Two-Factor Authentication (2FA)</Text>
                    <Text style={styles.twoFactorSubtitle}>TOTP security code on every sign-in</Text>
                  </View>
                  <View style={[styles.statusBadge, twoFactorEnabled ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                    <Text style={[styles.statusBadgeText, twoFactorEnabled ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}>
                      {twoFactorEnabled ? "ACTIVE" : "OFF"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.twoFactorDesc}>
                  {twoFactorEnabled
                    ? "Your uncompressed vault photos and tree branches are secured with 6-digit authenticator codes."
                    : "Protect your photos from unauthorized access with Google Authenticator, 1Password, or Authy."}
                </Text>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <Pressable
                    style={styles.secondarySmallBtn}
                    onPress={() => {
                      setTwoFactorStep(twoFactorEnabled ? "backup" : "qr");
                      setTotpSetupCode("");
                      setTotpError("");
                      setActiveModal("2fa");
                    }}
                  >
                    <Text style={styles.secondarySmallBtnText}>
                      {twoFactorEnabled ? "View Backup Codes" : "Configure 2FA"}
                    </Text>
                  </Pressable>

                  {twoFactorEnabled ? (
                    <Pressable
                      style={[styles.secondarySmallBtn, { borderColor: colors.danger }]}
                      onPress={() => {
                        Alert.alert("Disable 2FA?", "Your vault will only be secured by password.", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Disable", style: "destructive", onPress: () => setTwoFactorEnabled(false) },
                        ]);
                      }}
                    >
                      <Text style={[styles.secondarySmallBtnText, { color: colors.danger }]}>Disable</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Remove EXIF GPS Location</Text>
                  <Text style={styles.switchDesc}>Strip GPS coordinates when sharing external links or photos</Text>
                </View>
                <Switch
                  value={privacy.stripGps}
                  onValueChange={(val) => setPrivacy((p) => ({ ...p, stripGps: val }))}
                  trackColor={{ false: colors.surface2, true: colors.lime }}
                  thumbColor={colors.bg}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Private Photo Tree Vault</Text>
                  <Text style={styles.switchDesc}>Derived branches visible strictly to invited space members</Text>
                </View>
                <Switch
                  value={privacy.privateTree}
                  onValueChange={(val) => setPrivacy((p) => ({ ...p, privateTree: val }))}
                  trackColor={{ false: colors.surface2, true: colors.lime }}
                  thumbColor={colors.bg}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Discoverable by Username</Text>
                  <Text style={styles.switchDesc}>Allow friends to search and find @{profile.username}</Text>
                </View>
                <Switch
                  value={privacy.discoverable}
                  onValueChange={(val) => setPrivacy((p) => ({ ...p, discoverable: val }))}
                  trackColor={{ false: colors.surface2, true: colors.lime }}
                  thumbColor={colors.bg}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Require Invite Approval</Text>
                  <Text style={styles.switchDesc}>Ask confirmation before joining new spaces</Text>
                </View>
                <Switch
                  value={privacy.requireApproval}
                  onValueChange={(val) => setPrivacy((p) => ({ ...p, requireApproval: val }))}
                  trackColor={{ false: colors.surface2, true: colors.lime }}
                  thumbColor={colors.bg}
                />
              </View>

              <Pressable style={styles.exportBtn} onPress={handleExport}>
                <Text style={styles.exportBtnText}>Export All Original Photos (.zip)</Text>
              </Pressable>

              <Pressable style={styles.primaryActionBtn} onPress={() => setActiveModal("none")}>
                <Text style={styles.primaryActionBtnText}>Done</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── 2FA Setup Modal ── */}
      <Modal
        visible={activeModal === "2fa"}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActiveModal("privacy")}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSubheading}>Security Setup</Text>
                <Text style={styles.modalTitle}>
                  {twoFactorStep === "backup" ? "Backup Recovery Codes" : "Two-Factor Auth (2FA)"}
                </Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setActiveModal("privacy")}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {twoFactorStep === "qr" && (
                <View style={{ gap: 14 }}>
                  <Text style={styles.switchDesc}>
                    Add your 4to Vault account to Google Authenticator, 1Password, or Authy using this setup key:
                  </Text>

                  <View style={styles.secretBox}>
                    <Text style={styles.secretKeyText}>{secretKey}</Text>
                    <Pressable style={styles.copyKeyBtn} onPress={copySecretKey}>
                      <Text style={styles.copyKeyBtnText}>Copy Key</Text>
                    </Pressable>
                  </View>

                  <Text style={[styles.switchDesc, { textAlign: "center", fontSize: 11 }]}>
                    Account: 4to Vault ({profile.email})
                  </Text>

                  <Pressable style={styles.primaryActionBtn} onPress={() => setTwoFactorStep("verify")}>
                    <Text style={styles.primaryActionBtnText}>Next: Enter 6-Digit Code →</Text>
                  </Pressable>
                </View>
              )}

              {twoFactorStep === "verify" && (
                <View style={{ gap: 14 }}>
                  <Text style={styles.switchDesc}>
                    Enter the 6-digit security code generated by your authenticator app:
                  </Text>

                  <TextInput
                    style={[styles.input, styles.totpInput]}
                    value={totpSetupCode}
                    onChangeText={(t) => {
                      setTotpSetupCode(t.replace(/\D/g, "").slice(0, 6));
                      setTotpError("");
                    }}
                    placeholder="000000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />

                  {totpError ? <Text style={{ color: colors.danger, fontSize: 12 }}>{totpError}</Text> : null}

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                    <Pressable style={[styles.primaryActionBtn, { flex: 1, backgroundColor: colors.surface2 }]} onPress={() => setTwoFactorStep("qr")}>
                      <Text style={[styles.primaryActionBtnText, { color: colors.text }]}>← Back</Text>
                    </Pressable>
                    <Pressable style={[styles.primaryActionBtn, { flex: 2 }]} onPress={verifyAndEnable2FA}>
                      <Text style={styles.primaryActionBtnText}>Activate 2FA</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {twoFactorStep === "backup" && (
                <View style={{ gap: 14 }}>
                  <View style={styles.successBanner}>
                    <Text style={styles.successBannerText}>✓ Two-Factor Authentication is Active</Text>
                  </View>

                  <Text style={styles.switchDesc}>
                    Save these 6 single-use emergency backup recovery codes in a secure place. If you ever lose your device, each code unlocks your account once:
                  </Text>

                  <View style={styles.backupGrid}>
                    {backupCodes.map((c, i) => (
                      <View key={i} style={styles.backupCodeCell}>
                        <Text style={styles.backupCodeText}>{c}</Text>
                      </View>
                    ))}
                  </View>

                  <Pressable style={styles.feedShortcutBtn} onPress={copyBackupCodes}>
                    <Text style={styles.feedShortcutBtnText}>Copy All Recovery Codes</Text>
                  </Pressable>

                  <Pressable style={styles.primaryActionBtn} onPress={() => setActiveModal("privacy")}>
                    <Text style={styles.primaryActionBtnText}>Done</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 },
  heading: { ...typography.heading, color: colors.text, marginBottom: 4 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.lime,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { ...typography.heading, color: colors.lime },
  profileDetails: { flex: 1 },
  name: { ...typography.title, color: colors.text },
  detail: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  bioText: { ...typography.caption, color: colors.textMuted, marginTop: 4, lineHeight: 16 },

  storageSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  storageRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  storageLabel: { ...typography.caption, color: colors.text, fontWeight: "600" },
  storageValue: { ...typography.caption, color: colors.lime },
  progressBar: { height: 6, backgroundColor: colors.surface2, borderRadius: 3, marginTop: 8, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.lime },
  storageCaption: { ...typography.caption, color: colors.textMuted, marginTop: 6, fontSize: 11 },

  row: {
    minHeight: 60,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowContent: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowIcon: { fontSize: 18, color: colors.lime },
  rowText: { ...typography.body, color: colors.text, fontWeight: "600" },
  rowSubtext: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  chevron: { ...typography.heading, color: colors.textMuted },
  danger: { ...typography.body, color: colors.danger, fontWeight: "600" },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    maxHeight: "86%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalSubheading: { ...typography.caption, color: colors.lime, letterSpacing: 0.5, marginBottom: 2 },
  modalTitle: { ...typography.title, color: colors.text },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: "bold" },
  modalScroll: { gap: 14, paddingBottom: 24 },

  inputGroup: { gap: 6 },
  inputLabel: { ...typography.caption, color: colors.textMuted, fontWeight: "600" },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  bioInput: { minHeight: 70, textAlignVertical: "top" },

  themeCard: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  themeCardTitle: { ...typography.caption, color: colors.lime, fontWeight: "700" },
  themeCardSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  switchInfo: { flex: 1 },
  switchTitle: { ...typography.body, color: colors.text, fontWeight: "600", fontSize: 14 },
  switchDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  feedShortcutBtn: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  feedShortcutBtnText: { ...typography.caption, color: colors.lime, fontWeight: "700" },

  exportBtn: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  exportBtnText: { ...typography.caption, color: colors.text, fontWeight: "600" },

  primaryActionBtn: {
    backgroundColor: colors.lime,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
  },
  primaryActionBtnText: { color: colors.bg, fontWeight: "700", fontSize: 15 },

  // 2FA Specific Styles
  twoFactorCard: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  twoFactorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  twoFactorIcon: { fontSize: 20 },
  twoFactorTitle: { ...typography.body, color: colors.text, fontWeight: "700", fontSize: 14 },
  twoFactorSubtitle: { ...typography.caption, color: colors.textMuted, fontSize: 11, marginTop: 1 },
  twoFactorDesc: { ...typography.caption, color: colors.textMuted, lineHeight: 16, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: "rgba(166,255,0,0.15)",
    borderColor: colors.lime,
  },
  statusBadgeInactive: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: colors.border,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  statusBadgeTextActive: { color: colors.lime },
  statusBadgeTextInactive: { color: colors.textMuted },
  secondarySmallBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  secondarySmallBtnText: { ...typography.caption, color: colors.text, fontWeight: "600" },

  secretBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.lime,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secretKeyText: { color: colors.lime, fontWeight: "700", fontSize: 14, letterSpacing: 1 },
  copyKeyBtn: { backgroundColor: colors.surface2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  copyKeyBtnText: { ...typography.caption, color: colors.text, fontWeight: "600" },
  totpInput: {
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 8,
    color: colors.lime,
    borderColor: colors.lime,
    borderWidth: 2,
    paddingVertical: 12,
  },
  successBanner: {
    backgroundColor: "rgba(166,255,0,0.15)",
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  successBannerText: { color: colors.lime, fontWeight: "700", fontSize: 13 },
  backupGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backupCodeCell: {
    width: "48%",
    backgroundColor: colors.surface,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backupCodeText: { color: colors.text, fontSize: 13, letterSpacing: 1 },
});
