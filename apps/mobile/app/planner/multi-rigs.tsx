import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  MULTI_RIG_MAX,
  MULTI_RIG_TARGETS_PER_RIG,
  TARGET_LIST_FILTERS,
  addDaysIso,
  bandAdviceForRigFilters,
  civilDate,
  customListRangesActive,
  defaultPlannedHoursForRigTargets,
  effectiveFocalLengthMm,
  fieldOfView,
  formatClock,
  formatImageableHours,
  frameFitLabel,
  listFilterLabel,
  objectTitle,
  planMultiRigs,
  primaryDesignation,
  roundHours,
  type Camera,
  type ImagingFilter,
  type TargetListFilter,
  type Telescope,
  type TimeInterval,
} from "@dss/core";
import { DateField } from "@/components/date-field";
import { MultiAltitudeChart } from "@/components/multi-altitude-chart";
import { MultiTargetPickerThumb } from "@/components/multi-target-picker-thumb";
import { Chip, useThemeStyles } from "@/components/ui";
import type { GearRig } from "@/lib/storage";
import { useLists } from "@/state/lists-context";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

const SERIES_COLORS = ["#7ad0e7", "#e0c07a", "#9ad67a", "#c79ae8", "#e08a7a", "#7ab8e0"];
const HOURS_MIN = 0;
const HOURS_MAX = 12;

type PickerSource =
  | { kind: "filtered" }
  | { kind: "favorites" }
  | { kind: "list"; listId: string; listName: string };

type RigDraft = {
  objectIds: string[];
  filterIds: string[];
  plannedHours: Record<string, number>;
};

export default function MultiRigsPlannerScreen() {
  const planner = usePlannerState();
  const lists = useLists();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [drafts, setDrafts] = useState<Record<string, RigDraft>>({});
  const [enabledRigIds, setEnabledRigIds] = useState<string[]>([]);
  const [rigsOpen, setRigsOpen] = useState(true);
  const [pickerRigId, setPickerRigId] = useState<string | null>(null);
  const [source, setSource] = useState<PickerSource>({ kind: "filtered" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [hoursDraft, setHoursDraft] = useState<Record<string, string>>({});

  const rigs = useMemo(() => planner.rigs.slice(0, MULTI_RIG_MAX), [planner.rigs]);
  const activeRigs = useMemo(
    () => rigs.filter((rig) => enabledRigIds.includes(rig.id)),
    [rigs, enabledRigIds],
  );

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, RigDraft> = {};
      for (const rig of rigs) {
        const existing = prev[rig.id];
        next[rig.id] = {
          objectIds: existing?.objectIds ?? [],
          filterIds: existing?.filterIds ?? [...rig.filterIds],
          plannedHours: existing?.plannedHours ?? {},
        };
      }
      return next;
    });
    setEnabledRigIds((prev) => {
      const kept = prev.filter((id) => rigs.some((rig) => rig.id === id));
      if (kept.length > 0) return kept;
      return rigs.map((rig) => rig.id);
    });
  }, [rigs]);

  useEffect(() => {
    setPickerRigId((current) => {
      if (current && activeRigs.some((rig) => rig.id === current)) return current;
      return activeRigs[0]?.id ?? null;
    });
  }, [activeRigs]);

  const catalogueById = useMemo(() => {
    const map = new Map((planner.catalogue ?? []).map((item) => [item.id, item]));
    for (const item of planner.shortlist) map.set(item.object.id, item.object);
    return map;
  }, [planner.catalogue, planner.shortlist]);

  const plan = useMemo(() => {
    if (!planner.setupReady || activeRigs.length === 0) return null;
    const assignments = activeRigs.flatMap((rig) => {
      const draft = drafts[rig.id];
      if (!draft || draft.objectIds.length === 0) return [];
      const filterKinds = draft.filterIds
        .map((id) => planner.filterList.find((item) => item.id === id)?.kind)
        .filter((kind): kind is NonNullable<typeof kind> => Boolean(kind));
      const field = opticsFieldForRig(rig, planner.telescopes, planner.cameraList);
      return draft.objectIds.flatMap((objectId) => {
        const object = catalogueById.get(objectId);
        if (!object) return [];
        const band = bandAdviceForRigFilters(filterKinds, object);
        return [
          {
            rigId: rig.id,
            rigName: rig.name,
            object,
            filterIds: draft.filterIds,
            band,
            plannedHours: draft.plannedHours[objectId] ?? 2,
            field,
          },
        ];
      });
    });
    if (assignments.length === 0) return null;
    return planMultiRigs({
      site: planner.site,
      dateIso: planner.date,
      assignments,
    });
  }, [
    planner.setupReady,
    planner.site,
    planner.date,
    planner.telescopes,
    planner.cameraList,
    planner.filterList,
    activeRigs,
    drafts,
    catalogueById,
  ]);

  useEffect(() => {
    if (!plan) return;
    setDrafts((prev) => {
      let changed = false;
      const next = { ...prev };
      const byRig = new Map<string, typeof plan.assignments>();
      for (const item of plan.assignments) {
        const list = byRig.get(item.rigId) ?? [];
        list.push(item);
        byRig.set(item.rigId, list);
      }
      for (const [rigId, items] of byRig) {
        const draft = next[rigId];
        if (!draft) continue;
        const missing = items.filter((item) => draft.plannedHours[item.objectId] == null);
        if (missing.length === 0) continue;
        const usable: Record<string, number> = {};
        for (const item of items) usable[item.objectId] = item.usableHours;
        const defaults = defaultPlannedHoursForRigTargets(usable);
        next[rigId] = {
          ...draft,
          plannedHours: {
            ...defaults,
            ...draft.plannedHours,
          },
        };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [plan]);

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

  const filterChipLabel =
    planner.listFilter === "custom" && customListRangesActive(planner.customListRanges)
      ? `Custom · ${Math.round(planner.customListRanges.minFrameFillPercent)}–${Math.round(planner.customListRanges.maxFrameFillPercent)}%`
      : listFilterLabel(planner.listFilter);

  const listsChipLabel =
    source.kind === "list"
      ? `${source.listName} (${lists.lists.find((list) => list.id === source.listId)?.items.length ?? 0})`
      : "Lists";

  const colorByRigId = useMemo(() => {
    const map = new Map<string, string>();
    rigs.forEach((rig, index) => {
      map.set(rig.id, SERIES_COLORS[index % SERIES_COLORS.length]!);
    });
    return map;
  }, [rigs]);

  const nightMoon = plan?.assignments[0]?.track ?? null;

  function toggleRigEnabled(rigId: string) {
    setEnabledRigIds((prev) =>
      prev.includes(rigId) ? prev.filter((id) => id !== rigId) : [...prev, rigId],
    );
  }

  function chooseFilter(filter: TargetListFilter) {
    planner.setListFilter(filter);
    setSource({ kind: "filtered" });
    setFilterOpen(false);
  }

  function toggleObjectForRig(rigId: string, objectId: string) {
    setDrafts((prev) => {
      const draft = prev[rigId] ?? { objectIds: [], filterIds: [], plannedHours: {} };
      const has = draft.objectIds.includes(objectId);
      if (has) {
        const plannedHours = { ...draft.plannedHours };
        delete plannedHours[objectId];
        return {
          ...prev,
          [rigId]: {
            ...draft,
            objectIds: draft.objectIds.filter((id) => id !== objectId),
            plannedHours,
          },
        };
      }
      if (draft.objectIds.length >= MULTI_RIG_TARGETS_PER_RIG) return prev;
      return {
        ...prev,
        [rigId]: {
          ...draft,
          objectIds: [...draft.objectIds, objectId],
        },
      };
    });
  }

  function toggleFilter(rigId: string, filterId: string) {
    setDrafts((prev) => {
      const draft = prev[rigId];
      if (!draft) return prev;
      const has = draft.filterIds.includes(filterId);
      return {
        ...prev,
        [rigId]: {
          ...draft,
          filterIds: has ? draft.filterIds.filter((id) => id !== filterId) : [...draft.filterIds, filterId],
        },
      };
    });
  }

  function hoursKey(rigId: string, objectId: string) {
    return `${rigId}:${objectId}`;
  }

  function nudgeHours(rigId: string, objectId: string, delta: number) {
    setHoursDraft((prev) => {
      const next = { ...prev };
      delete next[hoursKey(rigId, objectId)];
      return next;
    });
    setDrafts((prev) => {
      const draft = prev[rigId];
      if (!draft) return prev;
      const result = plan?.assignments.find((item) => item.rigId === rigId && item.objectId === objectId);
      const max = Math.min(HOURS_MAX, result?.usableHours ?? HOURS_MAX);
      const current = draft.plannedHours[objectId] ?? result?.plannedHours ?? 2;
      return {
        ...prev,
        [rigId]: {
          ...draft,
          plannedHours: {
            ...draft.plannedHours,
            [objectId]: roundHours(Math.min(max, Math.max(HOURS_MIN, current + delta))),
          },
        },
      };
    });
  }

  function onHoursTextChange(rigId: string, objectId: string, text: string) {
    const cleaned = text.replace(/,/g, ".").replace(/[^\d.]/g, "");
    setHoursDraft((prev) => ({ ...prev, [hoursKey(rigId, objectId)]: cleaned }));
    if (cleaned === "" || cleaned === ".") return;
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return;
    setDrafts((prev) => {
      const draft = prev[rigId];
      if (!draft) return prev;
      const result = plan?.assignments.find((item) => item.rigId === rigId && item.objectId === objectId);
      const max = Math.min(HOURS_MAX, result?.usableHours ?? HOURS_MAX);
      return {
        ...prev,
        [rigId]: {
          ...draft,
          plannedHours: {
            ...draft.plannedHours,
            [objectId]: roundHours(Math.min(max, Math.max(HOURS_MIN, parsed))),
          },
        },
      };
    });
  }

  function commitHoursDraft(rigId: string, objectId: string) {
    setHoursDraft((prev) => {
      const next = { ...prev };
      delete next[hoursKey(rigId, objectId)];
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.title}>Multi-rigs</Text>
        <Text style={styles.subtitle}>
          Assign one or more targets and filters to each saved gear rig for one night. Rigs run in parallel; targets on
          the same rig share the mount without overlapping.
        </Text>

        {!planner.setupReady ? (
          <View style={[styles.card, { gap: 6 }]}>
            <Text style={[styles.body, { fontWeight: "600" }]}>Finish Tonight setup</Text>
            <Text style={styles.muted}>Set location, date, telescope, and camera first.</Text>
          </View>
        ) : rigs.length === 0 ? (
          <View style={[styles.card, { gap: 10 }]}>
            <Text style={[styles.body, { fontWeight: "600" }]}>Save at least two gear rigs</Text>
            <Text style={styles.muted}>
              Multi-rigs uses named scope + camera combos from Equipment. Create two or more, then return here.
            </Text>
            <Pressable onPress={() => router.push("/profile/equipment")} style={[styles.chip, styles.chipActive]}>
              <Text style={[styles.chipText, styles.accent]}>Open Equipment</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {rigs.length < 2 ? (
              <View style={[styles.card, { gap: 6 }]}>
                <Text style={[styles.body, { fontWeight: "600" }]}>Add another rig</Text>
                <Text style={styles.muted}>
                  MVP expects two or more rigs. You have one saved — add another in Equipment to compare parallel nights.
                </Text>
                <Pressable onPress={() => router.push("/profile/equipment")} style={styles.chip}>
                  <Text style={styles.chipText}>Open Equipment</Text>
                </Pressable>
              </View>
            ) : null}

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

            <View style={[styles.card, { gap: 10 }]}>
              <Pressable
                onPress={() => setRigsOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityState={{ expanded: rigsOpen }}
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.body, { fontWeight: "700" }]}>Rigs for this night</Text>
                  <Text style={styles.muted}>
                    {activeRigs.length === 0
                      ? "None selected"
                      : activeRigs.length === rigs.length
                        ? `All ${rigs.length} selected`
                        : `${activeRigs.length} of ${rigs.length} selected · ${activeRigs.map((rig) => rig.name).join(", ")}`}
                  </Text>
                </View>
                <Text style={{ color: c.accent, fontSize: 12 }}>{rigsOpen ? "▲" : "▼"}</Text>
              </Pressable>
              {rigsOpen ? (
                <View style={{ gap: 8 }}>
                  {rigs.map((rig) => {
                    const enabled = enabledRigIds.includes(rig.id);
                    const color = colorByRigId.get(rig.id) ?? c.accent;
                    return (
                      <Pressable
                        key={rig.id}
                        onPress={() => toggleRigEnabled(rig.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: enabled }}
                        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            borderWidth: 1.5,
                            borderColor: enabled ? color : c.lineStrong,
                            backgroundColor: enabled ? color : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {enabled ? <Text style={{ color: c.bg, fontSize: 13, fontWeight: "700" }}>✓</Text> : null}
                        </View>
                        <Text style={[styles.body, { fontWeight: "600", color: enabled ? c.text : c.muted, flex: 1 }]}>
                          {rig.name}
                        </Text>
                        {drafts[rig.id]?.objectIds.length ? (
                          <Text style={styles.muted}>{drafts[rig.id]!.objectIds.length} targets</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={{ gap: 10 }}>
              <Text style={styles.label}>Rig assignments</Text>
              {activeRigs.length === 0 ? (
                <Text style={styles.muted}>Select at least one rig above to plan.</Text>
              ) : (
                <Text style={styles.muted}>Tap a rig card to assign targets.</Text>
              )}
              {activeRigs.map((rig) => {
                const draft = drafts[rig.id];
                const results = (plan?.assignments ?? []).filter((item) => item.rigId === rig.id);
                const filters = filtersForRig(rig, planner.filterList);
                const color = colorByRigId.get(rig.id) ?? c.accent;
                const selected = pickerRigId === rig.id;
                return (
                  <View
                    key={rig.id}
                    style={[styles.card, { gap: 10, borderColor: selected ? color : c.line }]}
                  >
                    <Pressable onPress={() => setPickerRigId(rig.id)} style={{ gap: 2 }}>
                      <Text style={[styles.body, { fontWeight: "700", color }]}>{rig.name}</Text>
                      <Text style={styles.muted}>{rigOpticsLabel(rig, planner.telescopes, planner.cameraList)}</Text>
                    </Pressable>

                    {selected ? (
                      <View style={{ gap: 8 }}>
                        <Text style={styles.label}>
                          Targets · up to {MULTI_RIG_TARGETS_PER_RIG}
                          {draft ? ` · ${draft.objectIds.length} selected` : ""}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                          <Pressable
                            onPress={() => {
                              setSource({ kind: "filtered" });
                              setFilterOpen(true);
                            }}
                            style={[
                              styles.chip,
                              source.kind === "filtered" ? styles.chipActive : null,
                              { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 },
                            ]}
                          >
                            <Text
                              style={[styles.chipText, source.kind === "filtered" ? styles.accent : null]}
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
                            style={[
                              styles.chip,
                              source.kind === "list" ? styles.chipActive : null,
                              { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 },
                            ]}
                          >
                            <Text style={[styles.chipText, source.kind === "list" ? styles.accent : null]} numberOfLines={1}>
                              {listsChipLabel}
                            </Text>
                            <Text style={{ color: c.accent, fontSize: 10 }}>▼</Text>
                          </Pressable>
                        </ScrollView>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                          {pickerItems.map((object) => {
                            const isSelected = draft?.objectIds.includes(object.id) ?? false;
                            const atCap = (draft?.objectIds.length ?? 0) >= MULTI_RIG_TARGETS_PER_RIG && !isSelected;
                            return (
                              <MultiTargetPickerThumb
                                key={object.id}
                                theme={planner.theme}
                                raDeg={object.raDeg}
                                decDeg={object.decDeg}
                                majorArcmin={object.majorArcmin}
                                label={primaryDesignation(object) || objectTitle(object)}
                                selected={isSelected}
                                disabled={atCap}
                                accent={color}
                                onPress={() => toggleObjectForRig(rig.id, object.id)}
                              />
                            );
                          })}
                        </ScrollView>
                      </View>
                    ) : null}

                    {!draft || draft.objectIds.length === 0 ? (
                      <Text style={styles.muted}>
                        {selected
                          ? `Pick up to ${MULTI_RIG_TARGETS_PER_RIG} targets above`
                          : "Tap this card to assign targets"}
                      </Text>
                    ) : (
                      <View style={{ gap: 12 }}>
                        {draft.objectIds.map((objectId) => {
                          const object = catalogueById.get(objectId);
                          const result = results.find((item) => item.objectId === objectId) ?? null;
                          const key = hoursKey(rig.id, objectId);
                          const hoursValue =
                            hoursDraft[key] ?? (draft.plannedHours[objectId] ?? result?.plannedHours ?? 2).toFixed(1);
                          return (
                            <View key={objectId} style={{ gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: c.line }}>
                              <Text style={[styles.body, { fontWeight: "600" }]}>
                                {object ? objectTitle(object) : objectId}
                              </Text>

                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 12,
                                }}
                              >
                                <Text style={styles.label}>Planned hours</Text>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                  <Pressable onPress={() => nudgeHours(rig.id, objectId, -0.5)} style={iconBtn(c)}>
                                    <Text style={styles.body}>−</Text>
                                  </Pressable>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                    <TextInput
                                      value={hoursValue}
                                      onChangeText={(text) => onHoursTextChange(rig.id, objectId, text)}
                                      onBlur={() => commitHoursDraft(rig.id, objectId)}
                                      onSubmitEditing={() => commitHoursDraft(rig.id, objectId)}
                                      keyboardType="decimal-pad"
                                      selectTextOnFocus
                                      accessibilityLabel={`${rig.name} ${objectId} planned hours`}
                                      style={[
                                        styles.input,
                                        {
                                          width: 64,
                                          minHeight: 36,
                                          paddingVertical: 6,
                                          paddingHorizontal: 8,
                                          textAlign: "center",
                                          fontWeight: "600",
                                        },
                                      ]}
                                    />
                                    <Text style={styles.muted}>h</Text>
                                  </View>
                                  <Pressable onPress={() => nudgeHours(rig.id, objectId, 0.5)} style={iconBtn(c)}>
                                    <Text style={styles.body}>+</Text>
                                  </Pressable>
                                </View>
                              </View>

                              {result ? (
                                <View style={{ gap: 4 }}>
                                  <Text style={styles.muted}>
                                    Imageable {formatImageableHours(result.usableHours)} · scheduled{" "}
                                    {formatImageableHours(result.allocatedHours)}
                                  </Text>
                                  <Text style={[styles.body, { fontFamily: "monospace", fontSize: 13, color }]}>
                                    {formatIntervals(result.assignedIntervals, planner.site.timezone)}
                                  </Text>
                                  <Text style={styles.muted}>
                                    Frame{" "}
                                    {result.frameFillPercent == null ? "—" : `${Math.round(result.frameFillPercent)}%`} ·{" "}
                                    {frameFitLabel(result.frameFit)} · peak {Math.round(result.maxAltitudeDeg)}°
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          );
                        })}

                        {results.length > 0 ? (
                          <View style={{ gap: 6 }}>
                            <Text style={styles.label}>Timeline</Text>
                            <Text style={styles.muted}>Bright segments are this rig’s planned windows.</Text>
                            <MultiAltitudeChart
                              theme={planner.theme}
                              series={results.map((item, index) => {
                                const object = catalogueById.get(item.objectId);
                                return {
                                  id: `${item.rigId}:${item.objectId}`,
                                  label:
                                    (object ? primaryDesignation(object) || objectTitle(object) : null) || item.objectName,
                                  color: SERIES_COLORS[index % SERIES_COLORS.length]!,
                                  track: item.track,
                                  highlightIntervals: item.assignedIntervals,
                                };
                              })}
                              timezone={planner.site.timezone}
                            />
                          </View>
                        ) : null}
                      </View>
                    )}

                    {filters.length > 0 ? (
                      <View style={{ gap: 6 }}>
                        <Text style={styles.label}>Filters</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                          {filters.map((filter) => (
                            <Chip
                              key={filter.id}
                              theme={planner.theme}
                              label={filter.name}
                              active={draft?.filterIds.includes(filter.id) ?? false}
                              onPress={() => toggleFilter(rig.id, filter.id)}
                            />
                          ))}
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.muted}>No filters saved on this rig.</Text>
                    )}
                  </View>
                );
              })}
            </View>

            {plan && plan.conflicts.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.label}>Conflicts</Text>
                {plan.conflicts.map((conflict) => (
                  <View key={`${conflict.kind}-${conflict.objectId}`} style={[styles.card, { gap: 4 }]}>
                    <Text style={[styles.body, { fontWeight: "600", color: c.clay }]}>{conflict.objectName}</Text>
                    <Text style={styles.muted}>{conflict.message}</Text>
                  </View>
                ))}
              </View>
            ) : null}
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
              maxHeight: "70%",
            }}
          >
            <Text style={[styles.label, { marginBottom: 8 }]}>Filter</Text>
            <ScrollView>
              {TARGET_LIST_FILTERS.map((filter) => {
                const selectedFilter = planner.listFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => chooseFilter(filter)}
                    style={[styles.card, selectedFilter ? { borderColor: c.accent } : null, { paddingVertical: 12, marginBottom: 8 }]}
                  >
                    <Text style={[styles.body, selectedFilter ? styles.accent : null]}>{listFilterLabel(filter)}</Text>
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
              maxHeight: "70%",
            }}
          >
            <Text style={[styles.label, { marginBottom: 8 }]}>Saved lists</Text>
            <ScrollView>
              {lists.lists.length === 0 ? (
                <Text style={styles.muted}>No saved lists yet.</Text>
              ) : (
                lists.lists.map((list) => (
                  <Pressable
                    key={list.id}
                    onPress={() => {
                      setSource({ kind: "list", listId: list.id, listName: list.name });
                      setListsOpen(false);
                    }}
                    style={[
                      styles.card,
                      source.kind === "list" && source.listId === list.id ? { borderColor: c.accent } : null,
                      { paddingVertical: 12, marginBottom: 8 },
                    ]}
                  >
                    <Text style={styles.body}>
                      {list.name} ({list.items.length})
                    </Text>
                  </Pressable>
                ))
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

function opticsFieldForRig(
  rig: GearRig,
  telescopes: Telescope[],
  cameras: Camera[],
): { widthArcmin: number; heightArcmin: number } | null {
  const telescope = telescopes.find((item) => item.id === rig.telescopeId);
  const camera = cameras.find((item) => item.id === rig.cameraId);
  if (!telescope || !camera) return null;
  const focalLengthMm = telescope.smart
    ? (telescope.smart.modes?.[0]?.focalLengthMm ?? telescope.focalLengthMm)
    : effectiveFocalLengthMm(telescope, rig.reducer);
  const field = fieldOfView(camera, focalLengthMm);
  return { widthArcmin: field.widthArcmin, heightArcmin: field.heightArcmin };
}

function rigOpticsLabel(rig: GearRig, telescopes: Telescope[], cameras: Camera[]): string {
  const telescope = telescopes.find((item) => item.id === rig.telescopeId);
  const camera = cameras.find((item) => item.id === rig.cameraId);
  if (!telescope || !camera) return "Missing scope or camera";
  const focal = telescope.smart
    ? (telescope.smart.modes?.[0]?.focalLengthMm ?? telescope.focalLengthMm)
    : effectiveFocalLengthMm(telescope, rig.reducer);
  return `${telescope.name} · ${Math.round(focal)} mm · ${camera.name}`;
}

function filtersForRig(rig: GearRig, filterList: ImagingFilter[]): ImagingFilter[] {
  return rig.filterIds
    .map((id) => filterList.find((item) => item.id === id))
    .filter((item): item is ImagingFilter => Boolean(item));
}

function formatIntervals(intervals: TimeInterval[], timeZone: string): string {
  if (intervals.length === 0) return "—";
  return intervals
    .map((interval) => `${formatClock(interval.start, timeZone)}–${formatClock(interval.end, timeZone)}`)
    .join(", ");
}

function iconBtn(c: ReturnType<typeof colors>) {
  return {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.lineStrong,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
}
