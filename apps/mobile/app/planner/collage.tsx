import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  TARGET_LIST_FILTERS,
  addDaysIso,
  civilDate,
  customListRangesActive,
  filterCatalogueIgnoringDate,
  formatDeclination,
  formatRightAscension,
  listFilterLabel,
  objectTitle,
  planCollage,
  suggestCollageGroups,
  type CollageGroupSuggestion,
  type PlanPickerSource,
  type TargetListFilter,
} from "@dss/core";
import { CollageSkyPreview } from "@/components/collage-sky-preview";
import { DateField } from "@/components/date-field";
import { ModuleGearPicker } from "@/components/module-gear-picker";
import { SavePlanControl } from "@/components/save-plan-control";
import { applySavedPlanGear } from "@/lib/apply-plan-gear";
import { consumeAsterismCollageSeed } from "@/lib/asterism-collage-seed";
import { planFilterFields, snapshotPlanGear, snapshotPlanSite } from "@/lib/plan-snapshot";
import { Chip, useThemeStyles } from "@/components/ui";
import { useImagingPlans } from "@/state/imaging-plans-context";
import { useLists } from "@/state/lists-context";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

const SERIES_COLORS = ["#7ad0e7", "#e0c07a", "#9ad67a", "#c79ae8", "#e08a7a", "#7ab8e0", "#e0b07a", "#8ad0c0"];

function normalizeHydratedSource(raw: PlanPickerSource | { kind: string }): {
  source: PlanPickerSource;
  ignoreDate: boolean;
} {
  if (raw.kind === "catalogue") {
    return { source: { kind: "filtered" }, ignoreDate: true };
  }
  if (raw.kind === "filtered" || raw.kind === "favorites" || raw.kind === "list") {
    return { source: raw as PlanPickerSource, ignoreDate: false };
  }
  return { source: { kind: "filtered" }, ignoreDate: false };
}

export default function CollagePlannerScreen() {
  const planner = usePlannerState();
  const lists = useLists();
  const imagingPlans = useImagingPlans();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [source, setSource] = useState<PlanPickerSource>({ kind: "filtered" });
  const [ignoreDate, setIgnoreDate] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [paddingPercent, setPaddingPercent] = useState(10);
  const [showTargetNames, setShowTargetNames] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<string[] | null>(null);
  const [seedGroup, setSeedGroup] = useState<CollageGroupSuggestion | null>(null);

  useEffect(() => {
    if (!imagingPlans.ready) return;
    let cancelled = false;
    void (async () => {
      const plan = await imagingPlans.consumePendingPlan("collage");
      if (cancelled || !plan || plan.module !== "collage") return;
      applySavedPlanGear(planner, plan);
      const hydrated = normalizeHydratedSource(plan.pickerSource);
      setSource(hydrated.source);
      setIgnoreDate(plan.ignoreDate ?? hydrated.ignoreDate);
      if (plan.dateIso) planner.setDate(plan.dateIso);
      setPaddingPercent(plan.paddingPercent);
      setPendingIds(plan.selectedObjectIds);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when plans are ready
  }, [imagingPlans.ready]);

  useEffect(() => {
    if (!planner.optics?.field) return;
    let cancelled = false;
    void (async () => {
      const seed = await consumeAsterismCollageSeed();
      if (cancelled || !seed || !planner.optics?.field) return;
      const plan = planCollage({
        targets: seed.targets,
        fov: {
          widthDeg: planner.optics.field.widthDeg,
          heightDeg: planner.optics.field.heightDeg,
        },
        paddingPercent,
      });
      if (!plan) return;
      const group: CollageGroupSuggestion = {
        id: `asterism:${seed.asterismId}`,
        targetIds: seed.targets.map((item) => item.id),
        plan,
        score: 1e9,
      };
      setSeedGroup(group);
      setSelectedGroupId(group.id);
      setIgnoreDate(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot when optics ready
  }, [planner.optics?.field]);

  const catalogueById = useMemo(() => {
    const map = new Map((planner.catalogue ?? []).map((item) => [item.id, item]));
    for (const item of planner.shortlist) map.set(item.object.id, item.object);
    return map;
  }, [planner.catalogue, planner.shortlist]);

  const field = planner.optics?.field ?? null;

  const candidateObjects = useMemo(() => {
    if (source.kind === "filtered") {
      if (ignoreDate) {
        if (!field || !planner.catalogue?.length) return [];
        return filterCatalogueIgnoringDate({
          catalogue: planner.catalogue,
          fov: { widthDeg: field.widthDeg, heightDeg: field.heightDeg },
          field: { widthArcmin: field.widthArcmin, heightArcmin: field.heightArcmin },
          listFilter: planner.listFilter,
          customRanges: planner.customListRanges,
          query: planner.targetQuery,
        });
      }
      return planner.shortlist.map((item) => item.object).slice(0, 80);
    }
    const ids =
      source.kind === "favorites"
        ? lists.favorites
        : (lists.lists.find((list) => list.id === source.listId)?.items.map((item) => item.objectId) ?? []);
    return ids
      .map((id) => catalogueById.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 80);
  }, [
    source,
    ignoreDate,
    planner.shortlist,
    planner.catalogue,
    planner.listFilter,
    planner.customListRanges,
    planner.targetQuery,
    lists.favorites,
    lists.lists,
    catalogueById,
    field,
  ]);

  const emptyPoolMessage = useMemo(() => {
    switch (source.kind) {
      case "filtered":
        return ignoreDate
          ? "No catalogue targets match this filter (date ignored)."
          : "No targets in the current Tonight filter for this night.";
      case "favorites":
        return "No favorites yet. Star targets from Tonight details.";
      case "list":
        return `${source.listName} is empty.`;
      default: {
        const unexpected: never = source;
        return unexpected;
      }
    }
  }, [source, ignoreDate]);

  const filterChipLabel =
    source.kind === "filtered"
      ? planner.listFilter === "custom" && customListRangesActive(planner.customListRanges)
        ? `Custom · ${Math.round(planner.customListRanges.minFrameFillPercent)}–${Math.round(planner.customListRanges.maxFrameFillPercent)}%`
        : listFilterLabel(planner.listFilter)
      : "Filter";

  const listsChipLabel =
    source.kind === "list"
      ? `${source.listName} (${lists.lists.find((list) => list.id === source.listId)?.items.length ?? 0})`
      : "Target Lists";

  const suggestions = useMemo(() => {
    const catalogueGroups =
      field && candidateObjects.length >= 2
        ? suggestCollageGroups({
            targets: candidateObjects.map((object) => ({
              id: object.id,
              name: objectTitle(object),
              raDeg: object.raDeg,
              decDeg: object.decDeg,
              majorArcmin: object.majorArcmin,
            })),
            fov: { widthDeg: field.widthDeg, heightDeg: field.heightDeg },
            paddingPercent,
          })
        : [];
    if (!seedGroup) return catalogueGroups;
    const refreshed =
      field != null
        ? (() => {
            const plan = planCollage({
              targets: seedGroup.plan.targets.map((item) => ({
                id: item.id,
                name: item.name,
                raDeg: item.raDeg,
                decDeg: item.decDeg,
              })),
              fov: { widthDeg: field.widthDeg, heightDeg: field.heightDeg },
              paddingPercent,
            });
            return plan
              ? { ...seedGroup, plan, targetIds: plan.targets.map((item) => item.id) }
              : seedGroup;
          })()
        : seedGroup;
    return [refreshed, ...catalogueGroups.filter((group) => group.id !== refreshed.id)];
  }, [field, candidateObjects, paddingPercent, seedGroup]);

  useEffect(() => {
    if (pendingIds && suggestions.length > 0) {
      const match = suggestions.find(
        (group) =>
          group.targetIds.length === pendingIds.length &&
          pendingIds.every((id) => group.targetIds.includes(id)),
      );
      setSelectedGroupId(match?.id ?? suggestions[0]?.id ?? null);
      setPendingIds(null);
      return;
    }
    if (!selectedGroupId || !suggestions.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(suggestions[0]?.id ?? null);
    }
  }, [suggestions, selectedGroupId, pendingIds]);

  const selectedGroup: CollageGroupSuggestion | null =
    suggestions.find((group) => group.id === selectedGroupId) ?? null;

  const colorById = useMemo(() => {
    const map = new Map<string, string>();
    selectedGroup?.targetIds.forEach((id, index) => {
      map.set(id, SERIES_COLORS[index % SERIES_COLORS.length]!);
    });
    return map;
  }, [selectedGroup]);

  const selectedGroupLabel = selectedGroup
    ? `${selectedGroup.targetIds.length} targets · ${selectedGroup.plan.requiredWidthDeg.toFixed(2)}° × ${selectedGroup.plan.requiredHeightDeg.toFixed(2)}°`
    : suggestions.length > 0
      ? "Choose a suggested collage"
      : "No suggestions";

  function chooseFilter(filter: TargetListFilter) {
    planner.setListFilter(filter);
    setSource({ kind: "filtered" });
    setFilterOpen(false);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.title}>Collage</Text>
        <Text style={styles.subtitle}>
          DeepSkyMate suggests multi-target groups that fit your FOV. Use filters such as Narrowband with or without a
          specific night.
        </Text>

        <ModuleGearPicker />

        {!field ? (
          <Text style={styles.muted}>Choose a saved rig or pick a telescope and camera above to continue.</Text>
        ) : (
          <>
            <View style={[styles.card, { gap: 10 }]}>
              <Pressable
                onPress={() => setIgnoreDate((value) => !value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: ignoreDate }}
                accessibilityLabel="Ignore date"
                style={[
                  styles.chip,
                  ignoreDate ? styles.chipActive : null,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    alignSelf: "stretch",
                    minHeight: 44,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                  },
                ]}
              >
                <Switch
                  value={ignoreDate}
                  onValueChange={setIgnoreDate}
                  trackColor={{ false: "#7a8080", true: c.accent }}
                  thumbColor={ignoreDate ? "#ffffff" : "#f2f2f0"}
                  ios_backgroundColor="#7a8080"
                />
                <Text style={[styles.chipText, ignoreDate ? styles.accent : null, { flex: 1, fontWeight: "600" }]}>
                  Ignore date
                </Text>
              </Pressable>
              {!ignoreDate ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ flex: 1.35, minWidth: 0 }}>
                    <DateField
                      theme={planner.theme}
                      label="Night of (MM-DD-YYYY)"
                      valueIso={planner.date}
                      onChangeIso={planner.setDate}
                      compact
                    />
                  </View>
                  <Chip
                    theme={planner.theme}
                    label="Prev"
                    active={false}
                    onPress={() => planner.setDate(addDaysIso(planner.date, -1))}
                    style={{ flexShrink: 0, paddingHorizontal: 10, paddingVertical: 8 }}
                  />
                  <Chip
                    theme={planner.theme}
                    label="Today"
                    active={planner.date === civilDate(planner.site.timezone)}
                    onPress={() => planner.setDate(civilDate(planner.site.timezone))}
                    style={{ flexShrink: 0, paddingHorizontal: 10, paddingVertical: 8 }}
                  />
                  <Chip
                    theme={planner.theme}
                    label="Next"
                    active={false}
                    onPress={() => planner.setDate(addDaysIso(planner.date, 1))}
                    style={{ flexShrink: 0, paddingHorizontal: 10, paddingVertical: 8 }}
                  />
                </View>
              ) : null}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Candidate pool</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                <Pressable
                  onPress={() => {
                    setSource({ kind: "filtered" });
                    setFilterOpen(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter, ${filterChipLabel}`}
                  style={[
                    styles.chip,
                    source.kind === "filtered" ? styles.chipActive : null,
                    {
                      minHeight: 40,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                    },
                  ]}
                >
                  <Text
                    style={[styles.chipText, source.kind === "filtered" ? styles.accent : null, { flexShrink: 1 }]}
                    numberOfLines={1}
                  >
                    {filterChipLabel}
                  </Text>
                  <Text style={{ color: c.accent, fontSize: 10 }}>▼</Text>
                </Pressable>
                <Chip
                  theme={planner.theme}
                  label={`Favorites (${lists.favorites.length})`}
                  active={source.kind === "favorites"}
                  onPress={() => setSource({ kind: "favorites" })}
                />
                <Pressable
                  onPress={() => setListsOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Target Lists, ${listsChipLabel}`}
                  style={[
                    styles.chip,
                    source.kind === "list" ? styles.chipActive : null,
                    {
                      minHeight: 40,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                    },
                  ]}
                >
                  <Text
                    style={[styles.chipText, source.kind === "list" ? styles.accent : null, { flexShrink: 1 }]}
                    numberOfLines={1}
                  >
                    {listsChipLabel}
                  </Text>
                  <Text style={{ color: c.accent, fontSize: 10 }}>▼</Text>
                </Pressable>
              </ScrollView>
            </View>

            {candidateObjects.length < 2 ? (
              <Text style={styles.muted}>{emptyPoolMessage}</Text>
            ) : suggestions.length === 0 ? (
              <View style={[styles.card, { gap: 10 }]}>
                <Text style={[styles.body, { fontWeight: "600" }]}>No collage groups in this FOV</Text>
                <Text style={styles.muted}>
                  Searched {candidateObjects.length} targets from the selected pool. Try a wider scope, lower padding,
                  or a different filter / list.
                </Text>
                <FramingToolbar
                  paddingPercent={paddingPercent}
                  setPaddingPercent={setPaddingPercent}
                  showTargetNames={showTargetNames}
                  setShowTargetNames={setShowTargetNames}
                  styles={styles}
                  c={c}
                />
              </View>
            ) : (
              <>
                <View style={{ gap: 8 }}>
                  <Text style={styles.label}>Suggested collages</Text>
                  <Pressable
                    onPress={() => setGroupsOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel={`Suggested collages, ${selectedGroupLabel}`}
                    style={[
                      styles.card,
                      {
                        minHeight: 52,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        paddingVertical: 12,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={[styles.body, { fontWeight: "600" }]} numberOfLines={1}>
                        {selectedGroupLabel}
                      </Text>
                      {selectedGroup ? (
                        <Text style={styles.muted} numberOfLines={2}>
                          {selectedGroup.plan.targets.map((target) => target.name).join(" · ")}
                        </Text>
                      ) : (
                        <Text style={styles.muted}>
                          {suggestions.length} group{suggestions.length === 1 ? "" : "s"} fit this FOV
                          {ignoreDate && source.kind === "filtered" ? " · date ignored" : ""}
                        </Text>
                      )}
                    </View>
                    <Text style={{ color: c.accent, fontSize: 12 }}>▼</Text>
                  </Pressable>
                </View>

                {selectedGroup ? (
                  <View style={[styles.card, { gap: 10 }]}>
                    <Text style={[styles.body, { fontWeight: "600" }]}>Framing</Text>
                    <Text style={styles.muted}>
                      {selectedGroup.plan.hint} · {formatRightAscension(selectedGroup.plan.center.raDeg)} ·{" "}
                      {formatDeclination(selectedGroup.plan.center.decDeg)} · rot{" "}
                      {selectedGroup.plan.rotationDeg.toFixed(0)}°
                    </Text>
                    <CollageSkyPreview
                      theme={planner.theme}
                      plan={selectedGroup.plan}
                      objectsById={catalogueById}
                      colors={colorById}
                      showNames={showTargetNames}
                    />
                    <FramingToolbar
                      paddingPercent={paddingPercent}
                      setPaddingPercent={setPaddingPercent}
                      showTargetNames={showTargetNames}
                      setShowTargetNames={setShowTargetNames}
                      styles={styles}
                      c={c}
                    />
                  </View>
                ) : null}
              </>
            )}
          </>
        )}

        <SavePlanControl
          theme={planner.theme}
          disabled={!selectedGroup || !planner.setupReady}
          disabledReason={
            !planner.setupReady
              ? "Set location and gear before saving."
              : "Pick a suggested collage group to save."
          }
          defaultName={
            selectedGroup ? `Collage · ${selectedGroup.targetIds.length} targets` : "Collage plan"
          }
          onSave={(name) => {
            if (!selectedGroup) return;
            imagingPlans.savePlan({
              name,
              module: "collage",
              siteRef: snapshotPlanSite(planner),
              pickerSource: source,
              ...planFilterFields(planner, source),
              gear: snapshotPlanGear(planner),
              selectedObjectIds: selectedGroup.targetIds,
              paddingPercent,
              rotationDeg: null,
              ignoreDate,
              dateIso: planner.date,
            });
          }}
        />
      </ScrollView>

      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setFilterOpen(false)} />
          <View
            style={{
              backgroundColor: c.bgRaised,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderColor: c.line,
              borderWidth: 1,
              padding: 16,
              paddingBottom: 28,
              gap: 8,
              maxHeight: "70%",
            }}
          >
            <Text style={[styles.label, { marginBottom: 4 }]}>Filter</Text>
            <ScrollView>
              {TARGET_LIST_FILTERS.map((filter) => {
                const selected = planner.listFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => chooseFilter(filter)}
                    style={[styles.card, selected ? { borderColor: c.accent } : null, { paddingVertical: 12, marginBottom: 8 }]}
                  >
                    <Text style={[styles.body, selected ? styles.accent : null]}>{listFilterLabel(filter)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setFilterOpen(false)} style={{ alignItems: "center", paddingVertical: 10 }}>
              <Text style={styles.muted}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={listsOpen} animationType="slide" transparent onRequestClose={() => setListsOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setListsOpen(false)} />
          <View
            style={{
              backgroundColor: c.bgRaised,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderColor: c.line,
              borderWidth: 1,
              padding: 16,
              paddingBottom: 28,
              gap: 8,
              maxHeight: "70%",
            }}
          >
            <Text style={[styles.label, { marginBottom: 4 }]}>Saved target lists</Text>
            <ScrollView>
              {lists.lists.length === 0 ? (
                <Text style={styles.muted}>No saved target lists yet.</Text>
              ) : (
                lists.lists.map((list) => {
                  const selected = source.kind === "list" && source.listId === list.id;
                  return (
                    <Pressable
                      key={list.id}
                      onPress={() => {
                        setSource({ kind: "list", listId: list.id, listName: list.name });
                        setListsOpen(false);
                      }}
                      style={[styles.card, selected ? { borderColor: c.accent } : null, { paddingVertical: 12, marginBottom: 8 }]}
                    >
                      <Text style={[styles.body, selected ? styles.accent : null]}>
                        {list.name} ({list.items.length})
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Pressable onPress={() => setListsOpen(false)} style={{ alignItems: "center", paddingVertical: 10 }}>
              <Text style={styles.muted}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={groupsOpen} animationType="slide" transparent onRequestClose={() => setGroupsOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setGroupsOpen(false)} />
          <View
            style={{
              backgroundColor: c.bgRaised,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderColor: c.line,
              borderWidth: 1,
              padding: 16,
              paddingBottom: 28,
              gap: 8,
              maxHeight: "75%",
            }}
          >
            <Text style={[styles.label, { marginBottom: 4 }]}>Suggested collages</Text>
            <Text style={[styles.muted, { marginBottom: 4 }]}>
              {suggestions.length} group{suggestions.length === 1 ? "" : "s"} fit this FOV
              {ignoreDate && source.kind === "filtered" ? " · date ignored" : ""}
            </Text>
            <ScrollView>
              {suggestions.map((group) => {
                const selected = group.id === selectedGroupId;
                const names = group.plan.targets.map((target) => target.name).join(" · ");
                return (
                  <Pressable
                    key={group.id}
                    onPress={() => {
                      setSelectedGroupId(group.id);
                      setGroupsOpen(false);
                    }}
                    style={[styles.card, selected ? { borderColor: c.accent } : null, { paddingVertical: 12, marginBottom: 8, gap: 4 }]}
                  >
                    <Text style={[styles.body, selected ? styles.accent : null, { fontWeight: "600" }]}>
                      {group.targetIds.length} targets · {group.plan.requiredWidthDeg.toFixed(2)}° ×{" "}
                      {group.plan.requiredHeightDeg.toFixed(2)}°
                    </Text>
                    <Text style={styles.muted} numberOfLines={3}>
                      {names}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setGroupsOpen(false)} style={{ alignItems: "center", paddingVertical: 10 }}>
              <Text style={styles.muted}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FramingToolbar({
  paddingPercent,
  setPaddingPercent,
  showTargetNames,
  setShowTargetNames,
  styles,
  c,
}: {
  paddingPercent: number;
  setPaddingPercent: (value: number | ((prev: number) => number)) => void;
  showTargetNames: boolean;
  setShowTargetNames: (value: boolean | ((prev: boolean) => boolean)) => void;
  styles: ReturnType<typeof useThemeStyles>;
  c: ReturnType<typeof colors>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 2 }}
    >
      <StepperRow
        label="Padding"
        value={`${paddingPercent}%`}
        onMinus={() => setPaddingPercent((value) => Math.max(0, value - 5))}
        onPlus={() => setPaddingPercent((value) => Math.min(40, value + 5))}
        styles={styles}
        c={c}
        minusLabel="Decrease padding"
        plusLabel="Increase padding"
      />
      <Pressable
        onPress={() => setShowTargetNames((value) => !value)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: showTargetNames }}
        accessibilityLabel="Show target labels"
        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <Text style={[styles.body, { fontWeight: "600" }]}>Targets</Text>
        <Switch
          value={showTargetNames}
          onValueChange={setShowTargetNames}
          trackColor={{ false: "#7a8080", true: c.accent }}
          thumbColor={showTargetNames ? "#ffffff" : "#f2f2f0"}
          ios_backgroundColor="#7a8080"
        />
      </Pressable>
    </ScrollView>
  );
}

function StepperRow({
  label,
  value,
  onMinus,
  onPlus,
  styles,
  c,
  minusLabel,
  plusLabel,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  styles: ReturnType<typeof useThemeStyles>;
  c: ReturnType<typeof colors>;
  minusLabel: string;
  plusLabel: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={[styles.body, { fontWeight: "600" }]}>{label}</Text>
      <Pressable
        onPress={onMinus}
        accessibilityRole="button"
        accessibilityLabel={minusLabel}
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.lineStrong,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={styles.body}>−</Text>
      </Pressable>
      <Text style={[styles.body, { minWidth: 44, textAlign: "center", fontWeight: "600" }]}>{value}</Text>
      <Pressable
        onPress={onPlus}
        accessibilityRole="button"
        accessibilityLabel={plusLabel}
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.lineStrong,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={styles.body}>+</Text>
      </Pressable>
    </View>
  );
}
