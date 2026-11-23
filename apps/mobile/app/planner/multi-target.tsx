import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MULTI_TARGET_MAX,
  TARGET_LIST_FILTERS,
  addDaysIso,
  bandLabel,
  buildMultiTargetTracks,
  civilDate,
  customListRangesActive,
  defaultRequestedHours,
  formatClock,
  formatImageableHours,
  listFilterLabel,
  multiTargetMoonAdvice,
  objectTitle,
  planMultiTargetNight,
  primaryDesignation,
  roundHours,
  sortTrackIdsByStrategy,
  type MultiTargetStrategy,
  type TargetListFilter,
} from "@dss/core";
import { DateField } from "@/components/date-field";
import { MultiAltitudeChart } from "@/components/multi-altitude-chart";
import { MultiTargetPickerThumb } from "@/components/multi-target-picker-thumb";
import { Chip, useThemeStyles } from "@/components/ui";
import { useLists } from "@/state/lists-context";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

const SERIES_COLORS = ["#7ad0e7", "#e0c07a", "#9ad67a", "#c79ae8", "#e08a7a", "#7ab8e0"];

const STRATEGIES: { id: MultiTargetStrategy; label: string }[] = [
  { id: "peak-first", label: "Peak first" },
  { id: "rise-order", label: "Rise order" },
  { id: "shortest-window-first", label: "Shortest first" },
];

type PickerSource =
  | { kind: "filtered" }
  | { kind: "favorites" }
  | { kind: "list"; listId: string; listName: string };

export default function MultiTargetPlannerScreen() {
  const planner = usePlannerState();
  const lists = useLists();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [strategy, setStrategy] = useState<MultiTargetStrategy>("peak-first");
  const [filterOpen, setFilterOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [source, setSource] = useState<PickerSource>({ kind: "filtered" });

  const catalogueById = useMemo(() => {
    const map = new Map((planner.catalogue ?? []).map((item) => [item.id, item]));
    for (const item of planner.shortlist) map.set(item.object.id, item.object);
    return map;
  }, [planner.catalogue, planner.shortlist]);

  const selectedObjects = useMemo(
    () => selectedIds.map((id) => catalogueById.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [selectedIds, catalogueById],
  );

  const tracks = useMemo(() => {
    if (!planner.setupReady || selectedObjects.length === 0) return [];
    return buildMultiTargetTracks({
      objects: selectedObjects,
      site: planner.site,
      dateIso: planner.date,
    });
  }, [planner.setupReady, planner.site, planner.date, selectedObjects]);

  useEffect(() => {
    if (tracks.length === 0) return;
    setBudgets((prev) => {
      const defaults = defaultRequestedHours(tracks);
      const next = { ...defaults };
      for (const track of tracks) {
        const id = track.object.id;
        if (prev[id] != null) next[id] = prev[id]!;
      }
      for (const id of Object.keys(next)) {
        if (!tracks.some((track) => track.object.id === id)) delete next[id];
      }
      return next;
    });
  }, [tracks]);

  const orderedTracks = useMemo(() => {
    const byId = new Map(tracks.map((item) => [item.object.id, item]));
    return selectedIds.map((id) => byId.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [tracks, selectedIds]);

  const moonById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof multiTargetMoonAdvice>>();
    for (const item of orderedTracks) map.set(item.object.id, multiTargetMoonAdvice(item));
    return map;
  }, [orderedTracks]);

  const nightMoon = orderedTracks[0]?.track ?? null;

  const plan = useMemo(
    () =>
      orderedTracks.length === 0
        ? null
        : planMultiTargetNight({
            tracks: orderedTracks,
            requestedHoursById: budgets,
            orderIds: selectedIds,
          }),
    [orderedTracks, budgets, selectedIds],
  );

  const assignmentById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof plan>["ordered"][number]>();
    for (const item of plan?.ordered ?? []) map.set(item.objectId, item);
    return map;
  }, [plan]);

  const colorById = useMemo(() => {
    const map = new Map<string, string>();
    selectedIds.forEach((id, index) => {
      map.set(id, SERIES_COLORS[index % SERIES_COLORS.length]!);
    });
    return map;
  }, [selectedIds]);

  const pickerItems = useMemo(() => {
    if (source.kind === "filtered") {
      return planner.shortlist.slice(0, 40).map((item) => item.object);
    }
    const ids =
      source.kind === "favorites"
        ? lists.favorites
        : (lists.lists.find((list) => list.id === source.listId)?.items.map((item) => item.objectId) ?? []);
    return ids
      .map((id) => catalogueById.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 40);
  }, [source, planner.shortlist, lists.favorites, lists.lists, catalogueById]);

  function chooseFilter(filter: TargetListFilter) {
    planner.setListFilter(filter);
    setSource({ kind: "filtered" });
    setFilterOpen(false);
  }

  const filterChipLabel =
    planner.listFilter === "custom" && customListRangesActive(planner.customListRanges)
      ? `Custom · ${Math.round(planner.customListRanges.minFrameFillPercent)}–${Math.round(planner.customListRanges.maxFrameFillPercent)}%`
      : listFilterLabel(planner.listFilter);

  const listsChipLabel =
    source.kind === "list"
      ? `${source.listName} (${lists.lists.find((list) => list.id === source.listId)?.items.length ?? 0})`
      : "Lists";

  const emptyPickerMessage = (() => {
    switch (source.kind) {
      case "filtered":
        return "Nothing matches this filter for tonight. Try another filter or night.";
      case "favorites":
        return "No favorites yet. Star targets from Tonight details.";
      case "list":
        return `${source.listName} is empty.`;
      default: {
        const unexpected: never = source;
        return unexpected;
      }
    }
  })();

  function toggleTarget(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= MULTI_TARGET_MAX) return prev;
      return [...prev, id];
    });
  }

  function nudgeBudget(id: string, delta: number) {
    setBudgets((prev) => {
      const track = tracks.find((item) => item.object.id === id);
      const max = track?.track.usableHours ?? 12;
      const current = prev[id] ?? 0;
      return { ...prev, [id]: roundHours(Math.min(max, Math.max(0, current + delta))) };
    });
  }

  function moveTarget(id: string, direction: -1 | 1) {
    setSelectedIds((prev) => {
      const index = prev.indexOf(id);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item!);
      return next;
    });
  }

  function applyStrategy(next: MultiTargetStrategy) {
    setStrategy(next);
    if (tracks.length < 2) return;
    setSelectedIds(sortTrackIdsByStrategy(tracks, next));
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.title}>Multi-target planner</Text>
        <Text style={styles.subtitle}>
          Pick up to {MULTI_TARGET_MAX} targets for one night, compare altitude windows, and allocate imaging hours
          without double-booking.
        </Text>

        {!planner.setupReady ? (
          <View style={[styles.card, { gap: 6 }]}>
            <Text style={[styles.body, { fontWeight: "600" }]}>Finish Tonight setup</Text>
            <Text style={styles.muted}>Set location, date, telescope, and camera first so windows and FOV match tonight.</Text>
          </View>
        ) : (
          <>
            <View style={[styles.card, { gap: 10 }]}>
              <Text style={styles.label}>Night</Text>
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
              {nightMoon ? (
                <Text style={styles.muted}>
                  {nightMoon.moonPhaseName} · {(nightMoon.moonIlluminatedFraction * 100).toFixed(0)}% moon
                </Text>
              ) : null}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Add targets</Text>
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
                  accessibilityLabel={`Lists, ${listsChipLabel}`}
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
              {pickerItems.length === 0 ? (
                <Text style={styles.muted}>{emptyPickerMessage}</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
                  {pickerItems.map((object) => {
                    const active = selectedIds.includes(object.id);
                    const full = !active && selectedIds.length >= MULTI_TARGET_MAX;
                    const label = primaryDesignation(object) || objectTitle(object);
                    return (
                      <MultiTargetPickerThumb
                        key={object.id}
                        theme={planner.theme}
                        raDeg={object.raDeg}
                        decDeg={object.decDeg}
                        majorArcmin={object.majorArcmin}
                        label={label}
                        selected={active}
                        disabled={full}
                        accent={colorById.get(object.id) ?? c.accent}
                        onPress={() => toggleTarget(object.id)}
                      />
                    );
                  })}
                </ScrollView>
              )}
              <Text style={{ color: c.faint, fontSize: 12 }}>
                {selectedIds.length}/{MULTI_TARGET_MAX} selected · scroll for more
              </Text>
            </View>

            {orderedTracks.length >= 1 ? (
              <View style={[styles.card, { gap: 10 }]}>
                <Text style={[styles.body, { fontWeight: "600" }]}>Shared altitude</Text>
                <Text style={styles.muted}>Bright segments are the scheduled shoot windows in order.</Text>
                <MultiAltitudeChart
                  theme={planner.theme}
                  timezone={planner.site.timezone}
                  series={orderedTracks.map((item, index) => {
                    const color = colorById.get(item.object.id) ?? SERIES_COLORS[0]!;
                    const assignment = assignmentById.get(item.object.id);
                    const label = primaryDesignation(item.object) || objectTitle(item.object);
                    return {
                      id: item.object.id,
                      label: `${index + 1}·${label}`,
                      color,
                      track: item.track,
                      highlightIntervals: assignment?.assignedIntervals ?? [],
                      highlightColor: color,
                    };
                  })}
                />
              </View>
            ) : null}

            {orderedTracks.length >= 1 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.label}>Hour budgets · shoot order</Text>
                {orderedTracks.length >= 2 ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {STRATEGIES.map((item) => (
                      <Chip
                        key={item.id}
                        theme={planner.theme}
                        label={item.label}
                        active={strategy === item.id}
                        onPress={() => applyStrategy(item.id)}
                      />
                    ))}
                  </View>
                ) : null}
                {orderedTracks.map((item, index) => {
                  const id = item.object.id;
                  const hours = budgets[id] ?? 0;
                  const assignment = assignmentById.get(id);
                  const moon = moonById.get(id);
                  return (
                    <View key={id} style={[styles.card, { gap: 8 }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <Text style={[styles.body, { fontWeight: "600", flex: 1 }]}>
                          {index + 1}. {objectTitle(item.object)}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <Pressable
                            onPress={() => moveTarget(id, -1)}
                            disabled={index === 0}
                            accessibilityRole="button"
                            accessibilityLabel="Move earlier in shoot order"
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: c.lineStrong,
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: index === 0 ? 0.35 : 1,
                            }}
                          >
                            <Text style={styles.body}>↑</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => moveTarget(id, 1)}
                            disabled={index === orderedTracks.length - 1}
                            accessibilityRole="button"
                            accessibilityLabel="Move later in shoot order"
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: c.lineStrong,
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: index === orderedTracks.length - 1 ? 0.35 : 1,
                            }}
                          >
                            <Text style={styles.body}>↓</Text>
                          </Pressable>
                        </View>
                      </View>
                      <Text style={styles.muted}>
                        {bandLabel(item.band)} · Imageable {formatImageableHours(item.track.usableHours)} · peak{" "}
                        {Math.round(item.track.maxTargetAltitude)}°
                        {item.track.maxTargetTime
                          ? ` at ${formatClock(item.track.maxTargetTime, planner.site.timezone)}`
                          : ""}
                      </Text>
                      {moon?.hint ? <Text style={{ color: c.clay, fontSize: 13 }}>{moon.hint}</Text> : null}
                      {assignment && assignment.allocatedHours > 0 ? (
                        <Text style={[styles.muted, { color: colorById.get(id) ?? c.accent }]}>
                          Scheduled {formatImageableHours(assignment.allocatedHours)} ·{" "}
                          {assignment.assignedIntervals
                            .map(
                              (interval) =>
                                `${formatClock(interval.start, planner.site.timezone)}–${formatClock(interval.end, planner.site.timezone)}`,
                            )
                            .join(", ")}
                        </Text>
                      ) : (
                        <Text style={styles.muted}>No free window for this duration in the current order.</Text>
                      )}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <Pressable
                          onPress={() => nudgeBudget(id, -0.5)}
                          accessibilityRole="button"
                          accessibilityLabel="Decrease hours"
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
                        <Text style={[styles.body, { minWidth: 56, textAlign: "center", fontWeight: "600" }]}>
                          {hours.toFixed(1)} h
                        </Text>
                        <Pressable
                          onPress={() => nudgeBudget(id, 0.5)}
                          accessibilityRole="button"
                          accessibilityLabel="Increase hours"
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
                        <Pressable onPress={() => toggleTarget(id)}>
                          <Text style={{ color: c.clay, fontSize: 13 }}>Remove</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.muted}>Select targets above to set hour budgets and shoot order.</Text>
            )}
          </>
        )}
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
            <Text style={[styles.label, { marginBottom: 4 }]}>Saved lists</Text>
            <ScrollView>
              {lists.lists.length === 0 ? (
                <Text style={styles.muted}>No saved lists yet.</Text>
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
    </SafeAreaView>
  );
}
