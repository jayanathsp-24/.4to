import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { mockTree } from "../../api/mock";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { layoutTree, type TreeBranch, type TreeOverview } from "../../features/tree/layout";

const AnimatedView = Animated.createAnimatedComponent(View);

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const label = status === "active" ? "LIVE" : status === "closed" ? "DONE" : "ARCH";
  const bg =
    status === "active" ? colors.lime
    : status === "closed" ? colors.textMuted
    : colors.border;
  const fg = status === "active" ? colors.bg : colors.text;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// ── Space card inside list view ─────────────────────────────────────────────
function SpaceCard({ space, onPress }: { space: ReturnType<typeof layoutTree>["leaves"][0]; onPress: () => void }) {
  return (
    <Pressable style={styles.spaceCard} onPress={onPress} accessibilityLabel={space.name}>
      <Image source={{ uri: space.coverThumbUrl ?? undefined }} style={styles.spaceCardImg} />
      <View style={styles.spaceCardBody}>
        <View style={styles.spaceCardRow}>
          <Text style={styles.spaceCardName} numberOfLines={1}>{space.name}</Text>
          <StatusBadge status={space.status} />
        </View>
        <Text style={styles.spaceCardMeta}>
          {space.startDate} · {space.memberCount} members · {space.sharedPhotoCount} photos
        </Text>
        {space.myContributionPending && (
          <View style={styles.pendingPill}>
            <Text style={styles.pendingPillText}>⚡ Your photos needed</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Branch row in list view ─────────────────────────────────────────────────
function BranchRow({ branch }: { branch: TreeBranch }) {
  const space = branch.spaces[0];
  const targetId = space?.spaceId || branch.id;
  return (
    <View style={styles.branchRow}>
      <Pressable
        style={styles.branchRowHeader}
        onPress={() => router.push(`/spaces/${targetId}`)}
        accessibilityLabel={`${branch.name} branch, ${branch.photoCount} photos`}
      >
        <View style={styles.branchDot} />
        <View style={styles.branchRowCopy}>
          <Text style={styles.branchRowName}>{branch.name}</Text>
          <Text style={styles.branchRowMeta}>
            {branch.photoCount} photos · {space?.startDate || "Active Space"}
          </Text>
        </View>
        <Pressable
          style={styles.branchOpenBtn}
          onPress={() => router.push(`/spaces/${targetId}`)}
          hitSlop={12}
        >
          <Text style={styles.branchOpenText}>Open ›</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

// ── Storage pill ────────────────────────────────────────────────────────────
function StoragePill({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <View style={styles.storagePill}>
      <View style={[styles.storageBar, { width: `${pct}%` }]} />
      <Text style={styles.storageText}>
        {(used / 1024 ** 3).toFixed(1)} GB / {(limit / 1024 ** 3).toFixed(0)} GB
      </Text>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function TreeScreen() {
  const [view, setView] = useState<"tree" | "list">("tree");
  const [tree] = useState<TreeOverview>(mockTree);
  const [uploads, setUploads] = useState(0);
  const layout = useMemo(() => layoutTree(tree), [tree]);

  // Gesture state
  const scale = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const baseScale = useSharedValue(1);

  const pan = Gesture.Pan().onChange((e) => {
    panX.value += e.changeX;
    panY.value += e.changeY;
  });
  const pinch = Gesture.Pinch()
    .onStart(() => { baseScale.value = scale.value; })
    .onChange((e) => { scale.value = Math.max(0.5, Math.min(3, baseScale.value * e.scale)); });
  const gesture = Gesture.Simultaneous(pan, pinch);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panX.value }, { translateY: panY.value }, { scale: scale.value }],
  }));

  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ["images"],
      quality: 1,
    });
    if (!result.canceled) setUploads(result.assets.length);
  }

  function reset() { scale.value = 1; panX.value = 0; panY.value = 0; }

  // Count total photos & spaces
  const totalPhotos = tree.root.photoCount;
  const totalSpaces = layout.leaves.length;
  const pendingCount = layout.leaves.filter((l) => l.myContributionPending).length;

  return (
    <View style={styles.page}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Photo Tree</Text>
          <Text style={styles.headerMeta}>
            {totalPhotos} originals · {totalSpaces} Spaces · @{tree.user.username}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setView(view === "tree" ? "list" : "tree")}
            style={styles.toggle}
            accessibilityLabel={view === "tree" ? "Switch to list view" : "Switch to tree view"}
          >
            <Text style={styles.toggleText}>{view === "tree" ? "List" : "Tree"}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statNum}>{totalPhotos}</Text>
          <Text style={styles.statLabel}>Photos</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statNum}>{totalSpaces}</Text>
          <Text style={styles.statLabel}>Spaces</Text>
        </View>
        <View style={[styles.statPill, pendingCount > 0 && styles.statPillWarning]}>
          <Text style={[styles.statNum, pendingCount > 0 && styles.statNumWarning]}>{pendingCount}</Text>
          <Text style={[styles.statLabel, pendingCount > 0 && styles.statLabelWarning]}>Pending</Text>
        </View>
        <StoragePill used={1.8 * 1024 ** 3} limit={5 * 1024 ** 3} />
      </View>

      {/* ── List view ── */}
      {view === "list" ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Text style={styles.listSectionLabel}>PHOTOSPACE BRANCHES</Text>
          {tree.root.branches.map((branch) => (
            <BranchRow
              key={branch.id}
              branch={branch}
            />
          ))}
        </ScrollView>
      ) : (
        /* ── Tree view ── */
        <GestureDetector gesture={gesture}>
          <View style={styles.viewport}>
            <AnimatedView style={[styles.world, { height: layout.height }, animatedStyle]}>
              <Svg
                width={layout.width}
                height={layout.height}
                accessibilityLabel="Interactive Photo Tree"
              >
                <Defs>
                  <LinearGradient id="trunkGrad" x1="0" y1="1" x2="0" y2="0">
                    <Stop offset="0" stopColor={colors.lime} stopOpacity="1" />
                    <Stop offset="1" stopColor={colors.limeDim} stopOpacity="0.6" />
                  </LinearGradient>
                </Defs>

                {/* Main Root Trunk */}
                <Path
                  d={`M${layout.width / 2} ${layout.height - 80} L${layout.width / 2} 80`}
                  stroke="url(#trunkGrad)"
                  strokeWidth={14}
                  strokeLinecap="round"
                  fill="none"
                />

                {/* Branch paths */}
                {layout.nodes.map((node) => (
                  <Path
                    key={`path-${node.id}`}
                    d={node.path}
                    stroke={colors.lime}
                    strokeOpacity={0.85}
                    strokeWidth={node.width}
                    strokeLinecap="round"
                    fill="none"
                  />
                ))}

                {/* Branch tip nodes */}
                {layout.nodes.map((node) => (
                  <Circle
                    key={`node-${node.id}`}
                    cx={node.x}
                    cy={node.y}
                    r={6}
                    fill={colors.lime}
                    fillOpacity={0.9}
                  />
                ))}

                {/* Space leaves (glow rings) */}
                {layout.leaves.map((leaf) => (
                  <Circle
                    key={`leaf-glow-${leaf.spaceId}`}
                    cx={leaf.x}
                    cy={leaf.y}
                    r={38}
                    fill={colors.lime}
                    fillOpacity={leaf.status === "archived" ? 0.03 : leaf.myContributionPending ? 0.18 : 0.10}
                    stroke={leaf.status === "active" ? colors.lime : leaf.status === "closed" ? colors.textMuted : colors.border}
                    strokeWidth={leaf.myContributionPending ? 2.5 : 1.5}
                  />
                ))}

                {/* Root dot */}
                <Circle
                  cx={layout.width / 2}
                  cy={layout.height - 60}
                  r={12}
                  fill={colors.lime}
                />
              </Svg>

              {/* Root label */}
              <View style={[styles.rootLabel, { left: layout.width / 2 - 56, top: layout.height - 48 }]}>
                <Text style={styles.rootLabelText}>@{tree.user.username}</Text>
              </View>

              {/* Branch hit targets */}
              {layout.nodes.map((node) => {
                const branch = tree.root.branches.find((b) => b.id === node.id);
                const spaceId = branch?.spaces[0]?.spaceId || branch?.id;
                return (
                  <Pressable
                    key={`hit-${node.id}`}
                    style={[styles.branchHit, { left: node.x - 28, top: node.y - 28 }]}
                    onPress={() => spaceId && router.push(`/spaces/${spaceId}`)}
                    accessibilityLabel={`${branch?.name || node.id} branch`}
                  />
                );
              })}

              {/* Space leaf thumbnails */}
              {layout.leaves.map((leaf) => (
                <Pressable
                  key={`leaf-${leaf.spaceId}`}
                  style={[styles.leafHit, { left: leaf.x - 40, top: leaf.y - 40 }]}
                  onPress={() => router.push(`/spaces/${leaf.spaceId}`)}
                  accessibilityLabel={`${leaf.name}, Space`}
                >
                  <View style={styles.leafImageWrap}>
                    <Image
                      source={{ uri: leaf.coverThumbUrl ?? undefined }}
                      style={styles.leafImage}
                    />
                    {/* Pending dot */}
                    {leaf.myContributionPending && <View style={styles.leafPendingDot} />}
                  </View>
                  <Text style={styles.leafLabel} numberOfLines={1}>
                    {leaf.name}
                  </Text>
                  <StatusBadge status={leaf.status} />
                </Pressable>
              ))}
            </AnimatedView>

            {/* Controls */}
            <Pressable style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetBtnText}>⊙ Reset</Text>
            </Pressable>
            <Text style={styles.hintText}>Pinch · drag · tap</Text>
          </View>
        </GestureDetector>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heading: { ...typography.heading, color: colors.text },
  headerMeta: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggle: {
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toggleText: { color: colors.lime, fontWeight: "700", fontSize: 13 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { fontSize: 26, color: colors.bg, lineHeight: 30 },

  // Stats row
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statPill: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statPillWarning: { borderColor: colors.lime, backgroundColor: colors.limeGlow },
  statNum: { fontSize: 18, fontWeight: "800", color: colors.text },
  statNumWarning: { color: colors.lime },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "600" },
  statLabelWarning: { color: colors.lime },

  // Storage pill
  storagePill: {
    flex: 1,
    height: 36,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storageBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.limeGlow,
    borderRadius: 10,
  },
  storageText: { fontSize: 10, color: colors.textMuted, fontWeight: "600" },

  // Upload banner
  uploadBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.limeGlow,
    borderBottomWidth: 1,
    borderBottomColor: colors.lime,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  uploadText: { color: colors.lime, fontWeight: "700", fontSize: 13 },
  uploadDismiss: { color: colors.textMuted, fontSize: 16 },

  // List view
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },
  listSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.lime,
    letterSpacing: 1.4,
    marginBottom: 10,
  },

  // Branch row
  branchRow: {
    marginBottom: 6,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  branchRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  branchDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.lime,
  },
  branchRowCopy: { flex: 1 },
  branchRowName: { color: colors.text, fontWeight: "700", fontSize: 15 },
  branchRowMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  branchOpenBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  branchOpenText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  chevron: { color: colors.lime, fontSize: 22, transform: [{ rotate: "0deg" }] },
  chevronDown: { transform: [{ rotate: "90deg" }] },
  branchExpanded: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },

  // Space card
  spaceCard: {
    flexDirection: "row",
    backgroundColor: colors.surface2,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 0,
  },
  spaceCardImg: {
    width: 72,
    height: 72,
    backgroundColor: colors.border,
  },
  spaceCardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    justifyContent: "center",
  },
  spaceCardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  spaceCardName: { flex: 1, color: colors.text, fontWeight: "700", fontSize: 14 },
  spaceCardMeta: { color: colors.textMuted, fontSize: 11 },
  pendingPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.limeGlow,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  pendingPillText: { color: colors.lime, fontSize: 10, fontWeight: "700" },

  // Status badge
  badge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },

  // Tree view
  viewport: { flex: 1, overflow: "hidden", backgroundColor: colors.surface },
  world: {
    width: 900,
    height: 720,
    alignSelf: "center",
  },

  // Root label
  rootLabel: {
    position: "absolute",
    width: 112,
    alignItems: "center",
  },
  rootLabelText: {
    color: colors.lime,
    fontWeight: "700",
    fontSize: 12,
    marginTop: 4,
  },

  // Branch hit areas
  branchHit: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  // Leaf thumbnails
  leafHit: {
    position: "absolute",
    width: 80,
    alignItems: "center",
    gap: 4,
  },
  leafImageWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: colors.lime,
    backgroundColor: colors.surface2,
  },
  leafImage: { width: "100%", height: "100%", borderRadius: 34 },
  leafPendingDot: {
    position: "absolute",
    right: 3,
    top: 3,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.lime,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  leafLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "600",
    maxWidth: 80,
    textAlign: "center",
  },

  // Controls
  resetBtn: {
    position: "absolute",
    right: 14,
    bottom: 14,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  hintText: {
    position: "absolute",
    left: 14,
    bottom: 18,
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
