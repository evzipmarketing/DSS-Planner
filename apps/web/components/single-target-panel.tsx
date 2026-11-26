"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
import { applySavedPlanGear } from "@/lib/apply-plan-gear";
import { planFilterFields, snapshotPlanGear, snapshotPlanSite } from "@/lib/plan-snapshot";
import { useImagingPlans } from "@/lib/use-imaging-plans";
import { useLists } from "@/lib/use-lists";
import { ModuleGearPicker } from "./module-gear-picker";
import { MultiTargetPickerThumb } from "./multi-target-picker-thumb";
import { SavePlanControl } from "./save-plan-control";
import { usePlannerState } from "./planner-context";

type PickerSource =
  | { kind: "filtered" }
  | { kind: "favorites" }
  | { kind: "list"; listId: string; listName: string };

const GOAL_HOURS_MIN = 0.5;
const GOAL_HOURS_MAX = 40;

export function SingleTargetPanel() {
  const planner = usePlannerState();
  const lists = useLists();
  const imagingPlans = useImagingPlans();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [source, setSource] = useState<PickerSource>({ kind: "filtered" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [goalHours, setGoalHours] = useState<number | null>(null);
  const [goalDraft, setGoalDraft] = useState<string | null>(null);
  const [bandOverride, setBandOverride] = useState<BandAdvice | null>(null);
  const filterHost = useRef<HTMLDivElement>(null);
  const listsHost = useRef<HTMLDivElement>(null);
  useMenuDismiss(filterOpen, filterHost, setFilterOpen);
  useMenuDismiss(listsOpen, listsHost, setListsOpen);

  useEffect(() => {
    if (!imagingPlans.ready) return;
    const plan = imagingPlans.consumePendingPlan("single-target");
    if (!plan || plan.module !== "single-target") return;
    applySavedPlanGear(planner, plan);
    setSource(plan.pickerSource);
    setSelectedId(plan.objectId);
    setGoalHours(plan.goalHours);
    setBandOverride(plan.bandOverride);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when plans are ready
  }, [imagingPlans.ready]);

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
      : "Target Lists";

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

  function onGoalTextChange(raw: string) {
    const cleaned = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
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

  if (!planner.locationReady || !planner.date) {
    return (
      <div className="single-target-panel">
        <p className="note" style={{ marginTop: 0 }}>
          Set location and date in Tonight settings first.
        </p>
      </div>
    );
  }

  return (
    <div className="single-target-panel">
      <p className="note" style={{ marginTop: 0 }}>
        Choose a target and the total integration hours you need. DeepSkyMate finds the dates and imageable windows from{" "}
        {planner.date} that add up to that goal.
      </p>

      <ModuleGearPicker />

      {!planner.telescope || !planner.camera ? (
        <p className="note">Choose a saved rig or pick a telescope and camera above to continue.</p>
      ) : (
      <>
      <div className="multi-target-source-row">
        <div className={`sort-menu filter-menu multi-target-filter-menu${filterOpen ? " open" : ""}`} ref={filterHost}>
          <button
            type="button"
            className="tab sort-tab"
            aria-expanded={filterOpen}
            aria-haspopup="listbox"
            aria-pressed={source.kind === "filtered"}
            onClick={() => {
              setListsOpen(false);
              setFilterOpen((open) => !open);
            }}
          >
            {filterChipLabel}
            <svg className="custom-chevron" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 6l4.5 4.5L12.5 6" />
            </svg>
          </button>
          {filterOpen ? (
            <div className="sort-panel sort-panel-left" role="listbox" aria-label="Filter targets">
              {TARGET_LIST_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className="sort-option"
                  role="option"
                  aria-selected={filter === planner.listFilter && source.kind === "filtered"}
                  onClick={() => chooseFilter(filter)}
                >
                  {listFilterLabel(filter)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="chip"
          aria-pressed={source.kind === "favorites"}
          onClick={() => {
            setFilterOpen(false);
            setListsOpen(false);
            setSource({ kind: "favorites" });
          }}
        >
          Favorites ({lists.favorites.length})
        </button>

        <div className={`sort-menu filter-menu multi-target-filter-menu${listsOpen ? " open" : ""}`} ref={listsHost}>
          <button
            type="button"
            className="tab sort-tab"
            aria-expanded={listsOpen}
            aria-haspopup="listbox"
            aria-pressed={source.kind === "list"}
            onClick={() => {
              setFilterOpen(false);
              setListsOpen((open) => !open);
            }}
          >
            {listsChipLabel}
            <svg className="custom-chevron" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 6l4.5 4.5L12.5 6" />
            </svg>
          </button>
          {listsOpen ? (
            <div className="sort-panel sort-panel-left" role="listbox" aria-label="Saved target lists">
              {lists.lists.length === 0 ? (
                <p className="note" style={{ margin: "8px 10px" }}>
                  No saved target lists yet.
                </p>
              ) : (
                lists.lists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    className="sort-option"
                    role="option"
                    aria-selected={source.kind === "list" && source.listId === list.id}
                    onClick={() => {
                      setSource({ kind: "list", listId: list.id, listName: list.name });
                      setListsOpen(false);
                    }}
                  >
                    {list.name} ({list.items.length})
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="multi-target-thumb-scroller" role="group" aria-label="Targets">
        {pickerItems.map((object) => (
          <MultiTargetPickerThumb
            key={object.id}
            raDeg={object.raDeg}
            decDeg={object.decDeg}
            majorArcmin={object.majorArcmin}
            label={primaryDesignation(object) || objectTitle(object)}
            selected={selectedId === object.id}
            accent="var(--accent)"
            onPress={() => setSelectedId(object.id)}
          />
        ))}
      </div>

      {selected && plan ? (
        <>
          <div className="hub-card single-target-summary">
            <strong>{objectTitle(selected)}</strong>
            <p className="note" style={{ margin: "4px 0 0" }}>
              {activeFilter ? `${activeFilter.name} · ` : ""}
              {band === "broadband"
                ? "Bright Moon nights are skipped"
                : band === "narrowband"
                  ? "Bright Moon nights are allowed unless the Moon is close"
                  : "Prefer darker nights; Moon-tolerant with narrowband"}
            </p>
            <div className="single-target-controls" role="group" aria-label="Imaging band">
              <span className="note" style={{ margin: 0 }}>
                Imaging band
              </span>
              <span className="multi-target-budget-controls">
                {(["broadband", "narrowband", "both"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="chip"
                    aria-pressed={band === option}
                    onClick={() => setBandOverride(option)}
                  >
                    {bandLabel(option)}
                  </button>
                ))}
              </span>
            </div>
            <div className="single-target-controls">
              <label>
                Total hours needed
                <span className="multi-target-budget-controls">
                  <button type="button" className="ghost" onClick={() => nudgeGoal(-0.5)} aria-label="Decrease goal">
                    −
                  </button>
                  <span className="single-target-goal-input">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Total hours needed"
                      value={goalDraft ?? effectiveGoal.toFixed(1)}
                      onChange={(event) => onGoalTextChange(event.target.value)}
                      onBlur={commitGoalDraft}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                    <span>h</span>
                  </span>
                  <button type="button" className="ghost" onClick={() => nudgeGoal(0.5)} aria-label="Increase goal">
                    +
                  </button>
                </span>
              </label>
            </div>
            <p className="single-target-progress">
              {plan.goalMet
                ? `${formatImageableHours(plan.cumulativeHours)} across ${plan.nights.length} night${plan.nights.length === 1 ? "" : "s"}`
                : `${formatImageableHours(plan.cumulativeHours)} found · ${formatImageableHours(plan.remainingHours)} still needed`}
            </p>
            <div className="single-target-bar" aria-hidden="true">
              <i
                style={{
                  width: `${Math.min(100, plan.goalHours <= 0 ? 0 : (plan.cumulativeHours / plan.goalHours) * 100)}%`,
                }}
              />
            </div>
            {!plan.goalMet ? (
              <p className="note" style={{ margin: 0 }}>
                Searched {plan.nightsScanned} nights from {planner.date}. Try a lower goal or another start date in Tonight
                settings.
              </p>
            ) : null}
          </div>

          <div className="single-target-nights">
            <strong>Dates & imageable times</strong>
            {plan.nights.length === 0 ? (
              <p className="note">No imageable nights found in the search window.</p>
            ) : (
              plan.nights.map((night, index) => (
                <div key={night.dateIso} className="hub-card single-target-night">
                  <strong>
                    {index + 1}. {night.dateIso}
                  </strong>
                  <p className="note" style={{ margin: "4px 0 0" }}>
                    Imageable {formatImageableHours(night.usableHours)} · use {formatImageableHours(night.plannedHours)} ·
                    cumulative {formatImageableHours(night.cumulativeHoursAfter)}
                  </p>
                  <p className="single-target-windows">{formatIntervals(night.plannedIntervals, planner.site.timezone)}</p>
                  <p className="note" style={{ margin: "4px 0 0" }}>
                    {night.moonPhaseName} · {(night.moonIlluminatedFraction * 100).toFixed(0)}% moon · peak{" "}
                    {Math.round(night.maxAltitudeDeg)}°
                  </p>
                  {night.moonHint ? <p className="single-target-moon-hint">{night.moonHint}</p> : null}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <p className="note">Pick a target and set total hours to see which nights cover the goal.</p>
      )}
      </>
      )}

      <SavePlanControl
        disabled={!selectedId || !planner.setupReady}
        disabledReason={!planner.setupReady ? "Set location and gear before saving." : "Select a target to save."}
        defaultName={selected ? `Single · ${objectTitle(selected)}` : "Single-target plan"}
        onSave={(name) => {
          if (!selectedId) return;
          imagingPlans.savePlan({
            name,
            module: "single-target",
            siteRef: snapshotPlanSite(planner),
            pickerSource: source,
            ...planFilterFields(planner, source),
            gear: snapshotPlanGear(planner),
            startDateIso: planner.date,
            objectId: selectedId,
            goalHours: effectiveGoal,
            bandOverride,
          });
        }}
      />
    </div>
  );
}

function formatIntervals(intervals: TimeInterval[], timeZone: string): string {
  if (intervals.length === 0) return "—";
  return intervals
    .map((interval) => `${formatClock(interval.start, timeZone)}–${formatClock(interval.end, timeZone)}`)
    .join(", ");
}

function useMenuDismiss(open: boolean, host: RefObject<HTMLElement | null>, setOpen: (open: boolean) => void) {
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;

  useEffect(() => {
    if (!open) return;
    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, 0);
    function onPointer(event: PointerEvent) {
      if (!armed) return;
      if (!host.current?.contains(event.target as Node)) setOpenRef.current(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenRef.current(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(armTimer);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, host]);
}
