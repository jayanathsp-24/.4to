import { useState } from "react";
import { Alert, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { mockPhotos } from "../../api/mock";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export default function SpaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<"Photos" | "Members" | "Chat">("Photos");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(["Maya: Amazing light today!", "Theo: I added the sunset shots."]);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [spaceName, setSpaceName] = useState(id === "coast" ? "Coast Weekend" : "Graduation");
  const [handle, setHandle] = useState(id === "coast" ? "coast_weekend" : "graduation_2026");
  const [coverPhotoId, setCoverPhotoId] = useState(mockPhotos[0]?.id);
  const [linkCopied, setLinkCopied] = useState(false);
  const space = spaceName;
  const inviteCode = id === "coast" ? "COAST26" : "GRAD26";
  async function copySpaceLink() {
    await Clipboard.setStringAsync(`.4to.app/join/${inviteCode}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1800);
  }
  async function shareSpace() {
    try {
      await Share.share({ message: `Join my .4to Photo Space "${space}" with code ${inviteCode}: .4to.app/join/${inviteCode}` });
    } catch {
      Alert.alert("Invite unavailable", "Please copy the code manually: " + inviteCode);
    }
  }
  return (
    <View style={styles.page}>
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Back">
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <View>
            <Text style={styles.heading}>{space}</Text>
            <Text style={styles.handle}>@{handle}</Text>
            <Text style={styles.code}>Join code: {inviteCode}</Text>
          </View>
        </View>
        <View style={styles.titleActions}>
          <Pressable style={styles.settings} onPress={() => setSettingsVisible(true)}>
            <Text style={styles.settingsText}>⚙</Text>
          </Pressable>
          <Pressable style={styles.invite} onPress={shareSpace}>
            <Text style={styles.inviteText}>Invite</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.progressText}>4/6 members have added photos</Text>
      <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
      <View style={styles.tabs}>{(["Photos", "Members", "Chat"] as const).map((name) => <Pressable key={name} style={[styles.tab, tab === name && styles.activeTab]} onPress={() => setTab(name)}><Text style={[styles.tabText, tab === name && styles.activeText]}>{name}</Text></Pressable>)}</View>
      {tab === "Photos" ? <>
        <Pressable style={styles.primary} onPress={() => router.push(`/spaces/add/${id}`)}><Text style={styles.primaryText}>Add your photos</Text></Pressable>
        <FlatList data={mockPhotos} numColumns={3} keyExtractor={(item) => item.id} contentContainerStyle={styles.grid} renderItem={({ item }) => <Image source={{ uri: item.uri }} style={styles.photo} />} />
      </> : tab === "Members" ? (
        <View style={styles.chat}><Text style={styles.member}>Maya · Owner</Text><Text style={styles.member}>Theo · Member</Text><Text style={styles.member}>Alex · Member</Text></View>
      ) : (
        <View style={styles.chat}>{messages.map((text, index) => <Text key={index} style={styles.message}>{text}</Text>)}<View style={styles.composer}><TextInput style={styles.messageInput} placeholder="Write a message…" placeholderTextColor={colors.textMuted} value={message} onChangeText={setMessage} /><Pressable onPress={() => { if (message) setMessages((current) => [...current, `Alex: ${message}`]); setMessage(""); }}><Text style={styles.send}>Send</Text></Pressable></View></View>
      )}
      {settingsVisible && <View style={styles.settingsCard}><Text style={styles.settingsTitle}>Space settings</Text><TextInput style={styles.input} value={spaceName} onChangeText={setSpaceName} placeholder="Space name" placeholderTextColor={colors.textMuted} /><View style={styles.handleRow}><TextInput style={[styles.input, styles.handleInput]} value={handle} onChangeText={(value) => setHandle(value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} autoCapitalize="none" placeholder="Space handle" placeholderTextColor={colors.textMuted} /><Pressable style={styles.copyButton} onPress={copySpaceLink}><Text style={styles.copyText}>{linkCopied ? "Copied" : "Copy link"}</Text></Pressable></View><Text style={styles.settingsHint}>Share as @{handle || "your_space"}</Text><TextInput style={[styles.input, styles.descriptionInput]} placeholder="Description" placeholderTextColor={colors.textMuted} multiline /><Text style={styles.settingsLabel}>Preview image from this Space</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewPicker}>{mockPhotos.map((photo) => <Pressable key={photo.id} style={[styles.previewOption, photo.id === coverPhotoId && styles.previewSelected]} onPress={() => setCoverPhotoId(photo.id)}><Image source={{ uri: photo.uri }} style={styles.previewImage} /></Pressable>)}</ScrollView><Text style={styles.settingsHint}>Choose one of the photos already shared here.</Text><Pressable style={styles.primary} onPress={() => setSettingsVisible(false)}><Text style={styles.primaryText}>Save settings</Text></Pressable></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  heading: { ...typography.heading, color: colors.text },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  backBtnText: { color: colors.text, fontSize: 18, fontWeight: "700" },
  titleActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  handle: { color: colors.lime, marginTop: 3, fontWeight: "700" },
  settings: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, justifyContent: "center", alignItems: "center" },
  settingsText: { color: colors.text, fontSize: 18 },
  code: { ...typography.caption, color: colors.lime, marginTop: 4, letterSpacing: 0.5 },
  invite: { borderWidth: 1, borderColor: colors.lime, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  inviteText: { color: colors.lime, fontWeight: "700" },
  progressText: { ...typography.caption, color: colors.textMuted, marginTop: 8 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 8, overflow: "hidden" },
  progressFill: { height: 6, width: "66%", backgroundColor: colors.lime },
  tabs: { flexDirection: "row", gap: 8, marginVertical: 16 },
  tab: { flex: 1, height: 40, borderRadius: 20, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
  activeTab: { backgroundColor: colors.lime },
  tabText: { ...typography.caption, color: colors.textMuted },
  activeText: { color: colors.bg, fontWeight: "700" },
  primary: { height: 48, borderRadius: 12, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  primaryText: { ...typography.body, color: colors.bg, fontWeight: "700" },
  grid: { paddingVertical: 4 },
  photo: { flex: 1 / 3, aspectRatio: 1, margin: 4, borderRadius: 8 },
  member: { ...typography.body, color: colors.text, paddingVertical: 10 },
  chat: { flex: 1, gap: 8 },
  message: { ...typography.body, color: colors.text, backgroundColor: colors.surface, borderRadius: 12, padding: 12 },
  composer: { marginTop: "auto", height: 48, borderRadius: 12, backgroundColor: colors.surface2, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  messageInput: { flex: 1, ...typography.body, color: colors.textMuted },
  send: { ...typography.body, color: colors.lime, fontWeight: "700" },
  settingsCard: { position: "absolute", left: 16, right: 16, top: 100, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 10 },
  settingsTitle: { ...typography.heading, color: colors.text },
  input: { height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 12 },
  descriptionInput: { height: 72, paddingTop: 12 },
  settingsHint: { ...typography.caption, color: colors.textMuted },
  handleRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  handleInput: { flex: 1 },
  copyButton: { height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.lime, paddingHorizontal: 10, justifyContent: "center" },
  copyText: { ...typography.caption, color: colors.lime, fontWeight: "700" },
  settingsLabel: { ...typography.caption, color: colors.text },
  previewPicker: { gap: 8, paddingVertical: 2 },
  previewOption: { width: 72, height: 72, borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  previewSelected: { borderColor: colors.lime },
  previewImage: { width: "100%", height: "100%" },
});
