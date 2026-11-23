import { useLocalSearchParams } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { mockPhotos } from "../../api/mock";
import { colors } from "../../theme/colors";

export default function BranchScreen() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  return (
    <View style={styles.page}>
      <View style={styles.header}><View><Text style={styles.kicker}>PRIVATE BRANCH</Text><Text style={styles.title}>{name ?? "Branch"}</Text><Text style={styles.detail}>Your photos only</Text></View><Pressable style={styles.action}><Text style={styles.actionText}>＋</Text></Pressable></View>
      <ScrollView contentContainerStyle={styles.grid}>
        {mockPhotos.map((photo) => <Image key={photo.id} source={{ uri: photo.uri }} style={styles.photo} />)}
      </ScrollView>
      <View style={styles.footer}><Pressable style={styles.button}><Text style={styles.buttonText}>Rename branch</Text></Pressable><Pressable style={styles.secondary}><Text style={styles.secondaryText}>Add sub-branch</Text></Pressable></View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { color: colors.lime, fontSize: 11, letterSpacing: 1.4, fontWeight: "700" },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginTop: 6 },
  detail: { color: colors.textMuted, marginTop: 4 },
  action: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.lime, justifyContent: "center", alignItems: "center" },
  actionText: { color: colors.bg, fontSize: 28 },
  grid: { padding: 8, flexDirection: "row", flexWrap: "wrap" },
  photo: { width: "31.33%", aspectRatio: 1, margin: 4, borderRadius: 9, backgroundColor: colors.surface2 },
  footer: { padding: 16, gap: 8 },
  button: { minHeight: 46, borderRadius: 11, backgroundColor: colors.lime, justifyContent: "center", alignItems: "center" },
  buttonText: { color: colors.bg, fontWeight: "800" },
  secondary: { minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: colors.lime, justifyContent: "center", alignItems: "center" },
  secondaryText: { color: colors.lime, fontWeight: "800" },
});
