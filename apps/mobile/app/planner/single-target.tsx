import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  TARGET_LIST_FILTERS,
  bandAdviceForObject,
  bandAdviceFromFilter,
  bandLabel,
  customListRangesActive,
  formatClock,
  formatImageableHours,
  listFilterLabel,
  objectTitle,
  planSingleTarget,
  primaryDesignation,
  roundHours,
  suggestExposure,
  type BandAdvice,
  type TargetListFilter,
  type TimeInterval,
} from "@dss/core";
import { MultiTargetPickerThumb } from "@/components/multi-target-picker-thumb";
import { Chip, useThemeStyles } from "@/components/ui";
import { useLists } from "@/state/lists-context";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

const GOAL_HOURS_MIN = 0.5;
const GOAL_HOURS_MAX = 40;

type PickerSource =
  | { kind: "filtered" }
  | { kind: "favorites" }
  | { kind: "list"; listId: string; listName: string };

export default function SingleTargetPlannerScreen() {
  const planner = usePlannerState();
  const lists = useLists();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [source, setSource] = useState<PickerSource>({ kind: "filtered" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [goalHours, setGoalHours] = useState<number | null>(null);
  const [goalDraft, setGoalDraft] = useState<string | null>(null);
  const [bandOverride, setBandOverride] = useState<BandAdvice | null>(null);

  const catalogueById = useMemo(() => {
    const map = new Map((planner.catalogue ?? []).map((item) => [item.id, item]));
    for (const item of planner.shortlist) map.set(item.object.id, item.object);
    return map;
  }, [planner.catalogue, planner.shortlist]);

  const selected = selectedId ? catalogueById.get(selectedId) ?? null : null;

  const activeFilter = useMemo(() => {
    const id = planner.filterIds[0];
    if (!id) return planner.filterList.find((item) => item.kind === "luminance") ?? planner.filterList[0] ?? null;
    return planner.filterList.find((item) => item.id === id) ?? null;
  }, [planner.filterIds, planner.filterList]);

  const recommendedBand = useMemo((): BandAdvice => {
    if (activeFilter) return bandAdviceFromFilter(activeFilter.kind);
    if (selected) return bandAdviceForObject(selected);
    return "broadband";
  }, [activeFilter, selected]);

  const band = bandOverride ?? recommendedBand;

  const suggestedGoal = useMemo(() => {
    if (!selected || !planner.optics || !planner.camera || !activeFilter) return null;
    return suggestExposure({
      filter: activeFilter,
      bortle: planner.bortle,
      apertureMm: planner.optics.focalLengthMm / planner.optics.focalRatio,
      focalLengthMm: planner.optics.focalLengthMm,
      pixelScaleArcsec: planner.optics.pixelScale,
      readNoiseE: planner.camera.readNoiseE,
      magnitude: selected.magnitude,
    }).totalHours;
  }, [selected, planner.optics, planner.camera, planner.bortle, activeFilter]);

  useEffect(() => {
    if (suggestedGoal == null) return;
    setGoalHours((prev) => (prev == null ? roundHours(suggestedGoal) : prev));
  }, [suggestedGoal]);

  useEffect(() => {
    setGoalHours(null);
    setGoalDraft(null);
    setBandOverride(null);
  }, [selectedId]);

  const effectiveGoal = goalHours ?? suggestedGoal ?? 3;

  const plan = useMemo(() => {
    if (!selected || !planner.setupReady) return null;
    return planSingleTarget({
      object: selected,
      site: planner.site,
      startDateIso: planner.date,
      goalHours: effectiveGoal,
      band,
    });
  }, [selected, planner.setupReady, planner.site, planner.date, effectiveGoal, band]);

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

  function chooseFilter(filter: TargetListFilter) {
    planner.setListFilter(filter);
    setSource({ kind: "filtered" });
    setFilterOpen(false);
  }

  function clampGoal(value: number) {
    return roundHours(Math.min(GOAL_HOURS_MAX, Math.max(GOAL_HOURS_MIN, value)));
  }

  function nudgeGoal(delta: number) {
    setGoalDraft(null);
    setGoalHours((prev) => clampGoal((prev ?? effectiveGoal) + delta));
  }

  function onGoalTextChange(text: string) {
    const cleaned = text.replace(/,/g, ".").replace(/[^\d.]/g, "");
    setGoalDraft(cleaned);
    if (cleaned === "" || cleaned === ".") return;
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return;
    setGoalHours(clampGoal(parsed));
  }

  function commitGoalDraft() {
    if (goalDraft == null) return;
    const parsed = Number(goalDraft);
    setGoalHours(Number.isFinite(parsed) ? clampGoal(parsed) : clampGoal(effectiveGoal));
    setGoalDraft(null);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.title}>Single-target planner</Text>
        <Text style={styles.subtitle}>
          Choose a target and the total integration hours you need. DeepSkyMate finds the dates and imageable windows
          from {planner.date} that add up to that goal.
        </Text>

        {!planner.setupReady ? (
          <View style={[styles.card, { gap: 6 }]}>
            <Text style={[styles.body, { fontWeight: "600" }]}>Finish Tonight setup</Text>
            <Text style={styles.muted}>Set location, date, telescope, and camera first.</Text>
          </View>
        ) : (
          <>
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Target</Text>
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
                  <Text style={[styles.chipText, source.kind === "filtered" ? styles.accent : null]} numberOfLines={1}>
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
                {pickerItems.map((object) => (
                  <MultiTargetPickerThumb
                    key={object.id}
                    theme={planner.theme}
                    raDeg={object.raDeg}
                    decDeg={object.decDeg}
                    majorArcmin={object.majorArcmin}
                    label={primaryDesignation(object) || objectTitle(object)}
                    selected={selectedId === object.id}
                    accent={c.accent}
                    onPress={() => setSelectedId(object.id)}
                  />
                ))}
              </ScrollView>
            </View>

            {selected && plan ? (
              <>
                <View style={[styles.card, { gap: 10 }]}>
                  <Text style={[styles.body, { fontWeight: "600" }]}>{objectTitle(selected)}</Text>
                  <Text style={styles.muted}>
                    {activeFilter ? `${activeFilter.name} · ` : ""}
                    {band === "broadband"
                      ? "Bright Moon nights are skipped"
                      : band === "narrowband"
                        ? "Bright Moon nights are allowed unless the Moon is close"
                        : "Prefer darker nights; Moon-tolerant with narrowband"}
                  </Text>
                  <Text style={styles.label}>Imaging band</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {(["broadband", "narrowband", "both"] as const).map((option) => (
                      <Chip
                        key={option}
                        theme={planner.theme}
                        label={bandLabel(option)}
                        active={band === option}
                        onPress={() => setBandOverride(option)}
                      />
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Text style={styles.label}>Total hours needed</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Pressable onPress={() => nudgeGoal(-0.5)} style={iconBtn(c)}>
                        <Text style={styles.body}>−</Text>
                      </Pressable>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <TextInput
                          value={goalDraft ?? effectiveGoal.toFixed(1)}
                          onChangeText={onGoalTextChange}
                          onBlur={commitGoalDraft}
                          onSubmitEditing={commitGoalDraft}
                          keyboardType="decimal-pad"
                          selectTextOnFocus
                          accessibilityLabel="Total hours needed"
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
                      <Pressable onPress={() => nudgeGoal(0.5)} style={iconBtn(c)}>
                        <Text style={styles.body}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={[styles.body, { fontWeight: "600" }]}>
                    {plan.goalMet
                      ? `${formatImageableHours(plan.cumulativeHours)} across ${plan.nights.length} night${plan.nights.length === 1 ? "" : "s"}`
                      : `${formatImageableHours(plan.cumulativeHours)} found · ${formatImageableHours(plan.remainingHours)} still needed`}
                  </Text>
                  <View style={{ height: 8, borderRadius: 999, backgroundColor: c.bgSunken, overflow: "hidden" }}>
                    <View
                      style={{
                        width: `${Math.min(100, plan.goalHours <= 0 ? 0 : (plan.cumulativeHours / plan.goalHours) * 100)}%`,
                        height: "100%",
                        backgroundColor: c.accent,
                      }}
                    />
                  </View>
                  {!plan.goalMet ? (
                    <Text style={styles.muted}>
                      Searched {plan.nightsScanned} nights from {planner.date}. Try a lower goal or another start date in
                      Tonight settings.
                    </Text>
                  ) : null}
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={styles.label}>Dates & imageable times</Text>
                  {plan.nights.length === 0 ? (
                    <Text style={styles.muted}>No imageable nights found in the search window.</Text>
                  ) : (
                    plan.nights.map((night, index) => (
                      <View key={night.dateIso} style={[styles.card, { gap: 4 }]}>
                        <Text style={[styles.body, { fontWeight: "600" }]}>
                          {index + 1}. {night.dateIso}
                        </Text>
                        <Text style={styles.muted}>
                          Imageable {formatImageableHours(night.usableHours)} · use {formatImageableHours(night.plannedHours)} ·
                          cumulative {formatImageableHours(night.cumulativeHoursAfter)}
                        </Text>
                        <Text style={[styles.body, { fontFamily: "monospace", fontSize: 13 }]}>
                          {formatIntervals(night.plannedIntervals, planner.site.timezone)}
                        </Text>
                        <Text style={styles.muted}>
                          {night.moonPhaseName} · {(night.moonIlluminatedFraction * 100).toFixed(0)}% moon · peak{" "}
                          {Math.round(night.maxAltitudeDeg)}°
                        </Text>
                        {night.moonHint ? <Text style={{ color: c.clay, fontSize: 13 }}>{night.moonHint}</Text> : null}
                      </View>
                    ))
                  )}
                </View>
              </>
            ) : (
              <Text style={styles.muted}>Pick a target and set total hours to see which nights cover the goal.</Text>
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
