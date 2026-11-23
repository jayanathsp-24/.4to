import { View, StyleSheet, Text } from "react-native";
import { Empty } from "../../components/States";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

export default function FeedScreen() {
  return (
    <View style={styles.page}>
      <Text style={styles.heading}>Feed</Text>
      <Empty title="Personal feed is coming in Phase 2" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  heading: { ...typography.heading, color: colors.text },
});
