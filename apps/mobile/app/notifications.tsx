import { FlatList, StyleSheet, Text, View } from "react-native";
import { mockNotifications } from "../api/mock";
import { Card } from "../components/Card";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export default function NotificationsScreen() {
  return (
    <View style={styles.page}><FlatList data={mockNotifications} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <Card><View style={styles.row}><Text style={styles.title}>{item.title}</Text>{item.unread ? <View style={styles.dot} /> : null}</View><Text style={styles.detail}>{item.detail}</Text></Card>} /></View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { ...typography.body, color: colors.text, fontWeight: "600" },
  detail: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime },
});
