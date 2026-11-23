import { useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { mockPhotos } from "../../../api/mock";
import { colors } from "../../../theme/colors";
import { typography } from "../../../theme/typography";

export default function AddToSpaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  function toggle(photoId: string) {
    setSelected((current) => { const next = new Set(current); if (next.has(photoId)) next.delete(photoId); else next.add(photoId); return next; });
  }
  return (
    <View style={styles.page}>
      <Text style={styles.heading}>Suggested for this trip</Text>
      <FlatList data={mockPhotos} numColumns={3} keyExtractor={(item) => item.id} contentContainerStyle={styles.grid} renderItem={({ item }) => (
        <Pressable style={styles.photoWrap} onPress={() => toggle(item.id)}><Image source={{ uri: item.uri }} style={[styles.photo, selected.has(item.id) && styles.selected]} />{selected.has(item.id) ? <View style={styles.check}><Text style={styles.checkText}>✓</Text></View> : null}</Pressable>
      )} />
      <Pressable style={[styles.primary, !selected.size && styles.disabled]} onPress={() => router.back()}><Text style={styles.primaryText}>Share {selected.size || ""} photos</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  heading: { ...typography.title, color: colors.text, marginBottom: 12 },
  grid: { paddingVertical: 4 },
  photoWrap: { flex: 1 / 3, aspectRatio: 1, margin: 4 },
  photo: { width: "100%", height: "100%", borderRadius: 8, borderWidth: 2, borderColor: "transparent" },
  selected: { borderColor: colors.lime },
  check: { position: "absolute", right: 6, top: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  checkText: { color: colors.bg, fontWeight: "700" },
  primary: { height: 48, borderRadius: 12, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", marginTop: 12 },
  disabled: { opacity: 0.5 },
  primaryText: { ...typography.body, color: colors.bg, fontWeight: "700" },
});
