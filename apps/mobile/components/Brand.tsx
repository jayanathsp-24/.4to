import { Text, View, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row} accessibilityLabel=".4to">
      <Text style={[styles.word, compact && styles.compact]}><Text style={styles.dot}>.</Text><Text style={styles.four}>4</Text><Text style={styles.to}>to</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center" },
  word: { color: colors.text, fontSize: 54, fontWeight: "700", letterSpacing: -2 },
  compact: { fontSize: 28 },
  dot: { color: colors.text },
  four: { color: colors.lime },
  to: { color: colors.text },
});
