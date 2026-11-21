import { useMemo, useState, type ReactNode } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { objectTitle, primaryDesignation, type DeepSkyObject } from "@dss/core";
import { ObjectTypeIcon } from "@/components/object-type-icon";
import { GhostButton, OfflineBanner, PrimaryButton, useThemeStyles } from "@/components/ui";
import { useNetworkOnline } from "@/hooks/use-network";
import { useAuth } from "@/state/auth-context";
import { useLists } from "@/state/lists-context";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

export default function ListsScreen() {
  const planner = usePlannerState();
  const lists = useLists();
  const auth = useAuth();
  const online = useNetworkOnline();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [name, setName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [openListIds, setOpenListIds] = useState<Record<string, boolean>>({});

  const favoriteObjects = useMemo(
    () => (planner.catalogue ?? []).filter((object) => lists.favorites.includes(object.id)),
    [planner.catalogue, lists.favorites],
  );

  function toggleList(listId: string) {
    setOpenListIds((current) => ({ ...current, [listId]: !current[listId] }));
  }

  function confirmDelete(listId: string, listName: string) {
    Alert.alert("Delete list", `Remove “${listName}”?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => lists.deleteList(listId) },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList
        data={lists.lists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Text style={styles.title}>Lists</Text>
              <Pressable
                onPress={() => setCreateOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Create list"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.lineStrong,
                  backgroundColor: c.bgRaised,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: c.accent, fontSize: 22, fontWeight: "600", marginTop: -1 }}>+</Text>
              </Pressable>
            </View>
            <OfflineBanner theme={planner.theme} online={online} />
            {auth.user ? (
              <GhostButton theme={planner.theme} title={lists.syncing ? "Syncing…" : "Sync with account"} onPress={() => void lists.syncNow()} />
            ) : (
              <Text style={styles.muted}>Sign in under Profile to sync lists to the cloud.</Text>
            )}
            {lists.syncError ? <Text style={styles.muted}>{lists.syncError}</Text> : null}

            <CollapsibleSection
              theme={planner.theme}
              title="Favorites"
              icon={<HeartIcon color={c.accent} />}
              count={favoriteObjects.length}
              open={favoritesOpen}
              onToggle={() => setFavoritesOpen((open) => !open)}
            >
              {favoriteObjects.length === 0 ? (
                <Text style={styles.muted}>Star targets from the detail screen.</Text>
              ) : (
                favoriteObjects.map((object, index) => (
                  <TargetRow
                    key={object.id}
                    theme={planner.theme}
                    object={object}
                    divided={index > 0}
                    onPress={() => {
                      planner.chooseTarget(object.id);
                      router.push(`/target/${object.id}`);
                    }}
                  />
                ))
              )}
            </CollapsibleSection>
          </View>
        }
        renderItem={({ item }) => {
          const open = Boolean(openListIds[item.id]);
          return (
            <CollapsibleSection
              theme={planner.theme}
              title={item.name}
              icon={<ListIcon color={c.accent} />}
              count={item.items.length}
              open={open}
              onToggle={() => toggleList(item.id)}
              trailing={
                <Pressable
                  onPress={() => confirmDelete(item.id, item.name)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.name}`}
                  hitSlop={8}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TrashIcon color={c.muted} />
                </Pressable>
              }
            >
              {item.items.length === 0 ? (
                <Text style={styles.muted}>Empty — add targets from a target detail screen.</Text>
              ) : (
                item.items.map((entry, index) => {
                  const object = planner.catalogue?.find((row) => row.id === entry.objectId);
                  if (!object) {
                    return (
                      <View
                        key={entry.objectId}
                        style={
                          index > 0
                            ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, paddingTop: 8 }
                            : null
                        }
                      >
                        <Text style={styles.muted}>{entry.objectId}</Text>
                      </View>
                    );
                  }
                  return (
                    <TargetRow
                      key={entry.objectId}
                      theme={planner.theme}
                      object={object}
                      divided={index > 0}
                      onPress={() => {
                        planner.chooseTarget(object.id);
                        router.push(`/target/${object.id}`);
                      }}
                    />
                  );
                })
              )}
            </CollapsibleSection>
          );
        }}
        ListEmptyComponent={<Text style={[styles.muted, { marginTop: 4 }]}>No saved lists yet. Tap + to create one.</Text>}
      />

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 }} onPress={() => setCreateOpen(false)}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: c.bgRaised,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.line,
              padding: 16,
              gap: 12,
            }}
          >
            <Text style={[styles.body, { fontWeight: "600" }]}>New list</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Autumn galaxies"
              placeholderTextColor={c.faint}
              autoFocus
              onSubmitEditing={() => {
                if (!lists.createList(name)) return;
                setName("");
                setCreateOpen(false);
              }}
            />
            <PrimaryButton
              theme={planner.theme}
              title="Create"
              onPress={() => {
                if (!lists.createList(name)) return;
                setName("");
                setCreateOpen(false);
              }}
            />
            <Pressable onPress={() => setCreateOpen(false)} style={{ alignItems: "center", paddingVertical: 6 }}>
              <Text style={styles.muted}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function CollapsibleSection({
  theme,
  title,
  icon,
  count,
  open,
  onToggle,
  trailing,
  children,
}: {
  theme: "dark" | "night";
  title: string;
  icon?: ReactNode;
  count: number;
  open: boolean;
  onToggle: () => void;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const styles = useThemeStyles(theme);
  return (
    <View style={[styles.card, { gap: 0, paddingVertical: 4 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 4 }}
        >
          {icon}
          <Text style={[styles.body, { fontWeight: "600", flex: 1 }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.muted}>{count}</Text>
        </Pressable>
        {trailing}
      </View>
      {open ? <View style={{ gap: 2, paddingBottom: 8, paddingHorizontal: 4 }}>{children}</View> : null}
    </View>
  );
}

function TargetRow({
  theme,
  object,
  divided,
  onPress,
}: {
  theme: "dark" | "night";
  object: DeepSkyObject;
  divided?: boolean;
  onPress: () => void;
}) {
  const styles = useThemeStyles(theme);
  const c = colors(theme);
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderTopWidth: divided ? StyleSheet.hairlineWidth : 0,
        borderTopColor: c.line,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <ObjectTypeIcon type={object.type} color={c.accent} size={16} />
      <Text style={[styles.body, { flexShrink: 1, flex: 1 }]} numberOfLines={1}>
        {objectTitle(object)}
      </Text>
      <Text style={[styles.muted, { flexShrink: 0 }]} numberOfLines={1}>
        {primaryDesignation(object)}
      </Text>
    </Pressable>
  );
}

function ListIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HeartIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        d="M12 20.2s-7.2-4.4-7.2-9.2A3.9 3.9 0 0 1 12 7.4a3.9 3.9 0 0 1 7.2 3.6c0 4.8-7.2 9.2-7.2 9.2z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12zM10 11v6M14 11v6"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
