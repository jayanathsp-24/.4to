import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { mockFriends, type Friend } from "../../api/mock";
import { Card } from "../../components/Card";
import { Empty } from "../../components/States";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export default function FriendsScreen() {
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState(mockFriends);
  const filtered = friends.filter((friend) => friend.username.includes(query.replace("@", "")));

  function sendRequest(username: string) {
    setFriends((current) => current.some((friend) => friend.username === username) ? current : [...current, { id: `new-${username}`, name: `@${username}`, username }]);
  }

  return (
    <View style={styles.page}>
      <Text style={styles.heading}>Friends</Text>
      <TextInput style={styles.input} placeholder="Search @username" placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} autoCapitalize="none" />
      {query && !filtered.length ? <Pressable style={styles.request} onPress={() => sendRequest(query.replace("@", ""))}><Text style={styles.requestText}>Send request to @{query.replace("@", "")}</Text></Pressable> : null}
      {filtered.length ? <FlatList data={filtered} keyExtractor={(item: Friend) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <Card><Text style={styles.name}>{item.name}</Text><Text style={styles.detail}>@{item.username}</Text></Card>} /> : <Empty title="No friends match" />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  heading: { ...typography.heading, color: colors.text, marginBottom: 12 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 16 },
  request: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.lime, alignItems: "center", justifyContent: "center", marginTop: 12 },
  requestText: { ...typography.body, color: colors.lime },
  list: { gap: 8, marginTop: 12 },
  name: { ...typography.body, color: colors.text, fontWeight: "600" },
  detail: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
