import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MOSAIC_MAX_DIM,
  MOSAIC_ZOOM_STEP,
  TARGET_LIST_FILTERS,
  clampMosaicZoom,
  customListRangesActive,
  formatDeclination,
  formatMosaicCoordsList,
  formatMosaicPanelCoords,
  formatRightAscension,
  listFilterLabel,
  objectTitle,
  planMosaic,
  primaryDesignation,
  type MosaicPanel,
  type MosaicRaDec,
  type TargetListFilter,
} from "@dss/core";
import { ModuleGearPicker } from "@/components/module-gear-picker";
import { SavePlanControl } from "@/components/save-plan-control";
import { applySavedPlanGear } from "@/lib/apply-plan-gear";
import { planFilterFields, snapshotPlanGear, snapshotPlanSite } from "@/lib/plan-snapshot";
import { MosaicSkyPreview } from "@/components/mosaic-sky-preview";
import { MultiTargetPickerThumb } from "@/components/multi-target-picker-thumb";
import { Chip, useThemeStyles } from "@/components/ui";
import { useImagingPlans } from "@/state/imaging-plans-context";
import { useLists } from "@/state/lists-context";
import { usePlannerState } from "@/state/planner-context";
import { colors } from "@/theme/tokens";

type PickerSource =
  | { kind: "filtered" }
  | { kind: "favorites" }
  | { kind: "list"; listId: string; listName: string };

const DEFAULT_ROWS = 2;
const DEFAULT_COLS = 2;
const DEFAULT_OVERLAP = 10;
const DEFAULT_ROTATION = 0;

export default function MosaicPlannerScreen() {
  const planner = usePlannerState();
  const lists = useLists();
  const imagingPlans = useImagingPlans();
  const styles = useThemeStyles(planner.theme);
  const c = colors(planner.theme);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [source, setSource] = useState<PickerSource>({ kind: "filtered" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [overlapPercent, setOverlapPercent] = useState(DEFAULT_OVERLAP);
  const [rotationDeg, setRotationDeg] = useState(DEFAULT_ROTATION);
  const [zoom, setZoom] = useState(1);
  const [mosaicCenter, setMosaicCenter] = useState<MosaicRaDec | null>(null);
  const [showCoords, setShowCoords] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const skipCenterReset = useRef(false);

  useEffect(() => {
    if (!imagingPlans.ready) return;
    let cancelled = false;
    void (async () => {
      const plan = await imagingPlans.consumePendingPlan("mosaic");
      if (cancelled || !plan || plan.module !== "mosaic") return;
      skipCenterReset.current = true;
      applySavedPlanGear(planner, plan);
      setSource(plan.pickerSource);
      setSelectedId(plan.objectId);
      setRows(plan.rows);
      setCols(plan.cols);
      setOverlapPercent(plan.overlapPercent);
      setRotationDeg(plan.rotationDeg);
      setZoom(plan.zoom ?? 1);
      setMosaicCenter(plan.center);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when plans are ready
  }, [imagingPlans.ready]);

  const catalogueById = useMemo(() => {
    const map = new Map((planner.catalogue ?? []).map((item) => [item.id, item]));
    for (const item of planner.shortlist) map.set(item.object.id, item.object);
    return map;
  }, [planner.catalogue, planner.shortlist]);

  const selected = selectedId ? catalogueById.get(selectedId) ?? null : null;

  const field = planner.optics?.field ?? null;
  const panelFovDeg = field ? Math.max(field.widthDeg, field.heightDeg) : null;

  useEffect(() => {
    if (!selected) {
      setMosaicCenter(null);
      return;
    }
    if (skipCenterReset.current) {
      skipCenterReset.current = false;
      return;
    }
    setMosaicCenter({ raDeg: selected.raDeg, decDeg: selected.decDeg });
    setRotationDeg(DEFAULT_ROTATION);
    setZoom(1);
  }, [selectedId, selected?.raDeg, selected?.decDeg]);

  const plan = useMemo(() => {
    if (!selected || !planner.setupReady || !field || !mosaicCenter) return null;
    return planMosaic({
      centerRaDec: mosaicCenter,
      fov: { widthDeg: field.widthDeg, heightDeg: field.heightDeg },
      rows,
      cols,
      overlapPercent,
      rotationDeg,
      majorArcmin: selected.majorArcmin,
    });
  }, [selected, planner.setupReady, field, mosaicCenter, rows, cols, overlapPercent, rotationDeg]);

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
      : "Target Lists";

  function chooseFilter(filter: TargetListFilter) {
    planner.setListFilter(filter);
    setSource({ kind: "filtered" });
    setFilterOpen(false);
  }

  function clampDim(value: number) {
    return Math.min(MOSAIC_MAX_DIM, Math.max(1, value));
  }

  function clampOverlap(value: number) {
    return Math.min(80, Math.max(0, value));
  }

  function wrapRotation(value: number) {
    let next = value % 360;
    if (next < 0) next += 360;
    return next;
  }

  async function shareCoords(message: string, title: string) {
    setShareError(null);
    try {
      await Share.share({ title, message });
    } catch {
      setShareError("Could not share coordinates.");
    }
  }

  async function shareAll() {
    if (!plan || !selected) return;
    const header = `${objectTitle(selected)} · ${plan.rows}×${plan.cols} mosaic · ${plan.overlapPercent}% overlap · rot ${plan.rotationDeg}°`;
    await shareCoords(`${header}\n${formatMosaicCoordsList(plan)}`, "Mosaic panels");
  }

  async function sharePanel(panel: MosaicPanel) {
    await shareCoords(formatMosaicPanelCoords(panel), panel.label);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.title}>Mosaic</Text>
        <Text style={styles.subtitle}>
          Drag the mosaic grid on the sky plate to frame the target. Adjust rows, columns, overlap, and rotation; share
          panel centers when ready.
        </Text>

        {!planner.locationReady || !planner.date ? (
          <View style={[styles.card, { gap: 6 }]}>
            <Text style={[styles.body, { fontWeight: "600" }]}>Finish Tonight setup</Text>
            <Text style={styles.muted}>Set location and date first.</Text>
          </View>
        ) : (
          <>
            <ModuleGearPicker />
            {!field ? (
              <Text style={styles.muted}>Choose a saved rig or pick a telescope and camera above to continue.</Text>
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

            {selected && plan && mosaicCenter ? (
              <>
                <MosaicSkyPreview
                  theme={planner.theme}
                  object={selected}
                  plan={plan}
                  center={mosaicCenter}
                  onCenterChange={setMosaicCenter}
                  rotationDeg={rotationDeg}
                  onRotationChange={setRotationDeg}
                  zoom={zoom}
                />

                <View style={[styles.card, { gap: 12 }]}>
                  <Text style={[styles.body, { fontWeight: "600" }]}>{objectTitle(selected)}</Text>

                  <StepperRow
                    label="Rows"
                    value={String(rows)}
                    onMinus={() => setRows((prev) => clampDim(prev - 1))}
                    onPlus={() => setRows((prev) => clampDim(prev + 1))}
                    styles={styles}
                    c={c}
                  />
                  <StepperRow
                    label="Columns"
                    value={String(cols)}
                    onMinus={() => setCols((prev) => clampDim(prev - 1))}
                    onPlus={() => setCols((prev) => clampDim(prev + 1))}
                    styles={styles}
                    c={c}
                  />
                  <StepperRow
                    label="Overlap"
                    value={`${overlapPercent}%`}
                    onMinus={() => setOverlapPercent((prev) => clampOverlap(prev - 5))}
                    onPlus={() => setOverlapPercent((prev) => clampOverlap(prev + 5))}
                    styles={styles}
                    c={c}
                  />
                  <StepperRow
                    label="Rotation"
                    value={`${Math.round(rotationDeg)}°`}
                    onMinus={() => setRotationDeg((prev) => wrapRotation(prev - 5))}
                    onPlus={() => setRotationDeg((prev) => wrapRotation(prev + 5))}
                    styles={styles}
                    c={c}
                  />
                  <StepperRow
                    label="Zoom"
                    value={`${Math.round(zoom * 100)}%`}
                    onMinus={() => setZoom((prev) => clampMosaicZoom(prev - MOSAIC_ZOOM_STEP))}
                    onPlus={() => setZoom((prev) => clampMosaicZoom(prev + MOSAIC_ZOOM_STEP))}
                    styles={styles}
                    c={c}
                  />

                  <Text style={[styles.body, { fontWeight: "600" }]}>
                    {plan.rows}×{plan.cols} · {plan.panelCount} panels
                    {plan.coveragePercent != null ? ` · object ~${Math.round(plan.coveragePercent)}% of mosaic` : ""}
                  </Text>
                  <Text style={plan.undersampled ? { color: c.clay, fontSize: 13 } : styles.muted}>{plan.coverageHint}</Text>

                  <View style={{ flexDirection: "row", flexWrap: "nowrap", gap: 8 }}>
                    <Pressable
                      onPress={() => setMosaicCenter({ raDeg: selected.raDeg, decDeg: selected.decDeg })}
                      style={[
                        styles.chip,
                        { flex: 1, minHeight: 40, minWidth: 0, paddingHorizontal: 8, justifyContent: "center" },
                      ]}
                    >
                      <Text style={[styles.chipText, { textAlign: "center" }]} numberOfLines={1}>
                        Recenter
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void shareAll()}
                      style={[
                        styles.chip,
                        styles.chipActive,
                        { flex: 1, minHeight: 40, minWidth: 0, paddingHorizontal: 8, justifyContent: "center" },
                      ]}
                    >
                      <Text style={[styles.chipText, styles.accent, { textAlign: "center" }]} numberOfLines={1}>
                        Share all
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowCoords((open) => !open)}
                      style={[
                        styles.chip,
                        { flex: 1, minHeight: 40, minWidth: 0, paddingHorizontal: 8, justifyContent: "center" },
                      ]}
                    >
                      <Text style={[styles.chipText, { textAlign: "center" }]} numberOfLines={1}>
                        {showCoords ? "Hide list" : "Panel list"}
                      </Text>
                    </Pressable>
                  </View>
                  {shareError ? <Text style={{ color: c.clay, fontSize: 13 }}>{shareError}</Text> : null}
                </View>

                {showCoords ? (
                  <View style={{ gap: 8 }}>
                    <Text style={styles.label}>Panel coordinates</Text>
                    {plan.panels.map((panel) => (
                      <View
                        key={panel.label}
                        style={[styles.card, { flexDirection: "row", gap: 12, alignItems: "center" }]}
                      >
                        <MultiTargetPickerThumb
                          theme={planner.theme}
                          raDeg={panel.raDeg}
                          decDeg={panel.decDeg}
                          majorArcmin={null}
                          fovDeg={panelFovDeg ?? undefined}
                          label={panel.label}
                          selected={false}
                          accent={c.accent}
                          onPress={() => void sharePanel(panel)}
                        />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[styles.body, { fontWeight: "600" }]}>
                            {panel.label} · row {panel.row + 1}, col {panel.col + 1}
                          </Text>
                          <Text style={[styles.body, { fontFamily: "monospace", fontSize: 13 }]}>
                            {formatRightAscension(panel.raDeg)}
                          </Text>
                          <Text style={[styles.body, { fontFamily: "monospace", fontSize: 13 }]}>
                            {formatDeclination(panel.decDeg)}
                          </Text>
                          <Pressable onPress={() => void sharePanel(panel)} hitSlop={8}>
                            <Text style={[styles.accent, { fontSize: 13, fontWeight: "600" }]}>Share coords</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.muted}>Pick a target to build a mosaic grid for the active FOV.</Text>
            )}
            </>
            )}
            <SavePlanControl
              theme={planner.theme}
              disabled={!selectedId || !mosaicCenter || !planner.setupReady}
              disabledReason={
                !planner.setupReady ? "Set location and gear before saving." : "Select a target to save."
              }
              defaultName={selected ? `Mosaic · ${objectTitle(selected)}` : "Mosaic plan"}
              onSave={(name) => {
                if (!selectedId || !mosaicCenter) return;
                imagingPlans.savePlan({
                  name,
                  module: "mosaic",
                  siteRef: snapshotPlanSite(planner),
                  pickerSource: source,
                  ...planFilterFields(planner, source),
                  gear: snapshotPlanGear(planner),
                  objectId: selectedId,
                  center: mosaicCenter,
                  rows,
                  cols,
                  overlapPercent,
                  rotationDeg,
                  zoom,
                });
              }}
            />
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
            <Text style={[styles.label, { marginBottom: 8 }]}>Saved target lists</Text>
            <ScrollView>
              {lists.lists.length === 0 ? (
                <Text style={styles.muted}>No saved target lists yet.</Text>
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

function StepperRow({
  label,
  value,
  onMinus,
  onPlus,
  styles,
  c,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  styles: ReturnType<typeof useThemeStyles>;
  c: ReturnType<typeof colors>;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable onPress={onMinus} hitSlop={10} style={iconBtn(c)} accessibilityLabel={`Decrease ${label}`}>
          <Text style={styles.body}>−</Text>
        </Pressable>
        <Text style={[styles.body, { fontWeight: "600", minWidth: 52, textAlign: "center" }]}>{value}</Text>
        <Pressable onPress={onPlus} hitSlop={10} style={iconBtn(c)} accessibilityLabel={`Increase ${label}`}>
          <Text style={styles.body}>+</Text>
        </Pressable>
      </View>
    </View>
  );
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
