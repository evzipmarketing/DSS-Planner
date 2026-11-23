import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { buildPlanCsv, frameFillPercent, objectTitle, planCsvRowFromTarget } from "@dss/core";
import { constellationName } from "@dss/data";
import { AltitudeChart } from "@/components/altitude-chart";
import { FramingPreview } from "@/components/framing-preview";
import { ObjectDetails } from "@/components/object-details";
import { PrimaryButton, useThemeStyles } from "@/components/ui";
import { useLists } from "@/state/lists-context";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

export default function TargetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const planner = usePlannerState();
  const lists = useLists();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [listOpen, setListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => {
    if (id) planner.chooseTarget(id);
  }, [id]);

  const object = useMemo(
    () => planner.catalogue?.find((item) => item.id === id) ?? planner.selected,
    [planner.catalogue, planner.selected, id],
  );

  const ranked = useMemo(
    () => (object ? planner.shortlist.find((item) => item.object.id === object.id) : undefined),
    [planner.shortlist, object],
  );

  const field = planner.optics
    ? { widthArcmin: planner.optics.field.widthArcmin, heightArcmin: planner.optics.field.heightArcmin }
    : null;

  if (!object) {
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <Stack.Screen options={{ title: "Target", headerStyle: { backgroundColor: c.bgRaised }, headerTintColor: c.text }} />
        <Text style={styles.muted}>Target not found in the loaded catalogue.</Text>
      </View>
    );
  }

  const favorited = lists.favorites.includes(object.id);
  const target = object;

  async function shareTargetCsv() {
    const csv = buildPlanCsv([
      planCsvRowFromTarget({
        object: target,
        frameFillPercent: ranked?.frameFillPercent ?? frameFillPercent(target.majorArcmin, field),
        usableHours: ranked?.usableHours ?? null,
        band: ranked?.band ?? null,
        constellation: target.constellation ? constellationName(target.constellation) : "",
        listName: ranked ? "Tonight" : "",
      }),
    ]);
    setExportBusy(true);
    try {
      await Share.share({
        title: `DeepSkyMate ${objectTitle(target)}`,
        message: csv,
      });
    } catch {
      Alert.alert("Share failed", "Could not open the share sheet for this CSV.");
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
      <Stack.Screen
        options={{
          title: object.names[0] ?? object.id,
          headerStyle: { backgroundColor: c.bgRaised },
          headerTintColor: c.text,
        }}
      />
      <View style={styles.card}>
        <ObjectDetails
          theme={planner.theme}
          object={object}
          track={planner.track}
          timezone={planner.site.timezone}
          actions={
            <>
              <Pressable
                onPress={() => lists.toggleFavorite(object.id)}
                accessibilityRole="button"
                accessibilityLabel={favorited ? "Remove from favorites" : "Add to favorites"}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: favorited ? c.accent : c.lineStrong,
                  backgroundColor: c.bgSunken,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: favorited ? c.accent : c.muted, fontSize: 18 }}>{favorited ? "♥" : "♡"}</Text>
              </Pressable>
              <Pressable
                onPress={() => setListOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Add to list"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.lineStrong,
                  backgroundColor: c.bgSunken,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: c.accent, fontSize: 18, fontWeight: "600" }}>+</Text>
              </Pressable>
            </>
          }
        />
      </View>
      <View style={styles.card}>
        <Text style={[styles.body, { fontWeight: "600", marginBottom: 8 }]}>Altitude</Text>
        <AltitudeChart theme={planner.theme} track={planner.track} timezone={planner.site.timezone} />
      </View>
      <View style={styles.card}>
        <Text style={[styles.body, { fontWeight: "600", marginBottom: 8 }]}>Frame</Text>
        <FramingPreview />
        <View style={{ marginTop: 12 }}>
          <PrimaryButton
            theme={planner.theme}
            title={exportBusy ? "Opening share…" : "Export CSV"}
            onPress={() => void shareTargetCsv()}
            disabled={exportBusy}
          />
        </View>
      </View>

      <Modal visible={listOpen} animationType="slide" transparent onRequestClose={() => setListOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setListOpen(false)} />
          <View
            style={{
              backgroundColor: c.bgRaised,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderColor: c.line,
              borderWidth: 1,
              padding: 16,
              paddingBottom: 28,
              gap: 10,
            }}
          >
            <Text style={styles.label}>Add {objectTitle(object)} to a list</Text>
            {lists.lists.length === 0 ? <Text style={styles.muted}>No lists yet. Create one below.</Text> : null}
            {lists.lists.map((list) => {
              const already = list.items.some((item) => item.objectId === object.id);
              return (
                <Pressable
                  key={list.id}
                  onPress={() => {
                    if (!already) lists.addToList(list.id, object.id);
                    setListOpen(false);
                  }}
                  style={[styles.card, already ? { borderColor: c.accent } : null]}
                >
                  <Text style={[styles.body, already ? styles.accent : null]}>
                    {already ? "✓ " : ""}
                    {list.name}
                  </Text>
                </Pressable>
              );
            })}
            <TextInput
              style={styles.input}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="New list name"
              placeholderTextColor={c.faint}
            />
            <PrimaryButton
              theme={planner.theme}
              title="Create list and add"
              onPress={() => {
                const listId = lists.createList(newListName);
                if (!listId) return;
                lists.addToList(listId, object.id);
                setNewListName("");
                setListOpen(false);
              }}
            />
            <Pressable onPress={() => setListOpen(false)} style={{ alignItems: "center", paddingVertical: 8 }}>
              <Text style={styles.muted}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
