import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Card } from "../../components/Card";
import { Empty, ErrorState, Loading } from "../../components/States";
import { mockSpaces, type Space } from "../../api/mock";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export default function SpacesScreen() {
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [error, setError] = useState("");
  async function load() {
    setError("");
    setSpaces(null);
    try { await new Promise((resolve) => setTimeout(resolve, 250)); setSpaces(mockSpaces); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load Spaces"); }
  }
  useEffect(() => { void load(); }, []);
  if (spaces === null && !error) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!spaces?.length) return <Empty title="Create your first trip Space" action="Create Space" onAction={() => router.push("/spaces/create")} />;

  return (
    <View style={styles.page}>
      <View style={styles.header}><Text style={styles.heading}>Your Spaces</Text><Pressable style={styles.add} onPress={() => router.push("/spaces/create")}><Text style={styles.addText}>+</Text></Pressable></View>
      <FlatList data={spaces} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/spaces/${item.id}`)}>
          <Card><Image source={{ uri: item.cover }} style={styles.cover} /><Text style={styles.name}>{item.name}</Text><Text style={styles.detail}>{item.description}</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(item.progress / item.total) * 100}%` }]} /></View><Text style={styles.detail}>{item.progress}/{item.total} members have added photos</Text></Card>
        </Pressable>
      )} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12 },
  heading: { ...typography.heading, color: colors.text },
  add: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  addText: { fontSize: 28, color: colors.bg, lineHeight: 32 },
  list: { gap: 12, padding: 16 },
  cover: { width: "100%", height: 160, borderRadius: 12, marginBottom: 12 },
  name: { ...typography.title, color: colors.text },
  detail: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 12, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: colors.lime },
});
