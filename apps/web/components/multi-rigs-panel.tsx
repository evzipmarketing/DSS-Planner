"use client";

import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
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
import { applySavedPlanGear } from "@/lib/apply-plan-gear";
import { planFilterFields, snapshotPlanGear, snapshotPlanSite } from "@/lib/plan-snapshot";
import { useImagingPlans } from "@/lib/use-imaging-plans";
import { useLists } from "@/lib/use-lists";
import type { GearRig } from "@/lib/storage";
import { MultiAltitudeChart } from "./multi-altitude-chart";
import { MultiTargetPickerThumb } from "./multi-target-picker-thumb";
import { SavePlanControl } from "./save-plan-control";
import { usePlannerState } from "./planner-context";

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

function isoToDisplayDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match?.[1] || !match[2] || !match[3]) return iso;
  return `${match[2]}-${match[3]}-${match[1]}`;
}

function displayToIsoDate(display: string): string | null {
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(display.trim());
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function MultiRigsPanel() {
  const planner = usePlannerState();
  const lists = useLists();
  const imagingPlans = useImagingPlans();
  const datePickerId = useId();
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [dateText, setDateText] = useState(() => isoToDisplayDate(planner.date));
  const [drafts, setDrafts] = useState<Record<string, RigDraft>>({});
  const [enabledRigIds, setEnabledRigIds] = useState<string[]>([]);
  const [rigsOpen, setRigsOpen] = useState(true);
  const [pickerRigId, setPickerRigId] = useState<string | null>(null);
  const [source, setSource] = useState<PickerSource>({ kind: "filtered" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [hoursDraft, setHoursDraft] = useState<Record<string, string>>({});
  const filterHost = useRef<HTMLDivElement>(null);
  const listsHost = useRef<HTMLDivElement>(null);
  useMenuDismiss(filterOpen, filterHost, setFilterOpen);
  useMenuDismiss(listsOpen, listsHost, setListsOpen);

  useEffect(() => {
    if (!imagingPlans.ready) return;
    const plan = imagingPlans.consumePendingPlan("multi-rigs");
    if (!plan || plan.module !== "multi-rigs") return;
    applySavedPlanGear(planner, plan);
    setSource(plan.pickerSource);
    setEnabledRigIds(plan.enabledRigIds);
    setDrafts(plan.rigs);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when plans are ready
  }, [imagingPlans.ready]);

  const todayIso = civilDate(planner.site.timezone);
  const rigs = useMemo(() => planner.rigs.slice(0, MULTI_RIG_MAX), [planner.rigs]);
  const activeRigs = useMemo(
    () => rigs.filter((rig) => enabledRigIds.includes(rig.id)),
    [rigs, enabledRigIds],
  );

  useEffect(() => {
    setDateText(isoToDisplayDate(planner.date));
  }, [planner.date]);

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
      : "Target Lists";

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

  function pickDate(iso: string) {
    planner.setDate(iso);
    setDateText(isoToDisplayDate(iso));
  }

  function commitDateText(raw: string) {
    setDateText(raw);
    const iso = displayToIsoDate(raw);
    if (iso) planner.setDate(iso);
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

  function onHoursTextChange(rigId: string, objectId: string, raw: string) {
    const cleaned = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
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

  if (!planner.setupReady) {
    return (
      <div className="multi-rigs-panel">
        <p className="note" style={{ marginTop: 0 }}>
          Finish location, date, telescope, and camera in Tonight settings first.
        </p>
      </div>
    );
  }

  if (rigs.length === 0) {
    return (
      <div className="multi-rigs-panel">
        <p className="note" style={{ marginTop: 0 }}>
          Save at least two gear rigs under Profile → Equipment, then return here to assign targets for one night.
        </p>
      </div>
    );
  }

  return (
    <div className="multi-rigs-panel">
      <p className="note" style={{ marginTop: 0 }}>
        Assign one or more targets and filters to each saved gear rig for one night. Rigs run in parallel; targets on the
        same rig share the mount without overlapping.
      </p>

      {rigs.length < 2 ? (
        <div className="hub-card">
          <strong>Add another rig</strong>
          <p className="note" style={{ marginBottom: 0 }}>
            MVP expects two or more rigs. Create another under Profile → Equipment to compare parallel nights.
          </p>
        </div>
      ) : null}

      <div className="hub-card multi-target-date-card">
        <div className="date-nav-row">
          <label className="date-field date-field-inline" htmlFor={`${datePickerId}-text`}>
            <span className="sr-only">Night of (MM-DD-YYYY)</span>
            <span className="date-field-control">
              <input
                id={`${datePickerId}-text`}
                type="text"
                inputMode="numeric"
                placeholder="MM-DD-YYYY"
                aria-label="Night of (MM-DD-YYYY)"
                value={dateText}
                onChange={(event) => commitDateText(event.target.value)}
                onBlur={() => {
                  const iso = displayToIsoDate(dateText);
                  setDateText(iso ? isoToDisplayDate(iso) : isoToDisplayDate(planner.date));
                }}
              />
              <button
                type="button"
                className="date-picker-btn"
                aria-label="Open calendar"
                title="Open calendar"
                onClick={() => {
                  const input = datePickerRef.current;
                  if (!input) return;
                  if (typeof input.showPicker === "function") input.showPicker();
                  else input.click();
                }}
              >
                <CalendarIcon />
              </button>
              <input
                ref={datePickerRef}
                className="date-picker-native"
                type="date"
                value={planner.date}
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  if (!event.target.value) return;
                  pickDate(event.target.value);
                }}
              />
            </span>
          </label>
          <div className="day-row">
            <button type="button" className="day" onClick={() => pickDate(addDaysIso(planner.date, -1))}>
              Previous day
            </button>
            <button type="button" className="day" aria-pressed={planner.date === todayIso} onClick={() => pickDate(todayIso)}>
              Today
            </button>
            <button type="button" className="day" onClick={() => pickDate(addDaysIso(planner.date, 1))}>
              Next day
            </button>
          </div>
        </div>
        {nightMoon ? (
          <p className="note" style={{ margin: 0 }}>
            {nightMoon.moonPhaseName} · {(nightMoon.moonIlluminatedFraction * 100).toFixed(0)}% moon
          </p>
        ) : null}
      </div>

      <div className={`hub-card multi-rigs-enable-list${rigsOpen ? " is-open" : ""}`}>
        <button
          type="button"
          className="multi-rigs-enable-toggle"
          aria-expanded={rigsOpen}
          aria-controls="multi-rigs-enable-body"
          onClick={() => setRigsOpen((open) => !open)}
        >
          <span>
            <strong>Rigs for this night</strong>
            <span className="note">
              {activeRigs.length === 0
                ? "None selected"
                : activeRigs.length === rigs.length
                  ? `All ${rigs.length} selected`
                  : `${activeRigs.length} of ${rigs.length} selected · ${activeRigs.map((rig) => rig.name).join(", ")}`}
            </span>
          </span>
          <span className="multi-rigs-enable-chevron" aria-hidden="true">
            {rigsOpen ? "▲" : "▼"}
          </span>
        </button>
        {rigsOpen ? (
          <div id="multi-rigs-enable-body" className="multi-rigs-enable-body" role="group" aria-label="Rigs for this night">
            {rigs.map((rig) => {
              const enabled = enabledRigIds.includes(rig.id);
              return (
                <label key={rig.id} className={`multi-rigs-enable-row${enabled ? " is-enabled" : ""}`}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleRigEnabled(rig.id)}
                    aria-label={`Use ${rig.name}`}
                  />
                  <span className="multi-rigs-enable-name" style={{ color: colorByRigId.get(rig.id) }}>
                    {rig.name}
                  </span>
                  {drafts[rig.id]?.objectIds.length ? (
                    <span className="note">{drafts[rig.id]!.objectIds.length} targets</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        className="multi-rigs-columns"
        data-count={activeRigs.length === 1 || activeRigs.length === 2 ? String(activeRigs.length) : undefined}
      >
        {activeRigs.length === 0 ? (
          <p className="note">Select at least one rig above to plan.</p>
        ) : (
          <p className="note" style={{ gridColumn: "1 / -1", margin: 0 }}>
            Tap a rig card to assign targets.
          </p>
        )}
        {activeRigs.map((rig) => {
          const draft = drafts[rig.id];
          const results = (plan?.assignments ?? []).filter((item) => item.rigId === rig.id);
          const filters = filtersForRig(rig, planner.filterList);
          const color = colorByRigId.get(rig.id) ?? "var(--accent)";
          const selected = pickerRigId === rig.id;
          return (
            <div
              key={rig.id}
              className={`hub-card multi-rigs-column${selected ? " is-active" : ""}`}
              style={{ borderColor: selected ? color : undefined }}
            >
              <button type="button" className="multi-rigs-column-head" onClick={() => setPickerRigId(rig.id)}>
                <strong style={{ color }}>{rig.name}</strong>
                <span className="note">{rigOpticsLabel(rig, planner.telescopes, planner.cameraList)}</span>
              </button>

              {selected ? (
                <div className="multi-rigs-inline-picker">
                  <p className="note" style={{ margin: 0 }}>
                    Targets · up to {MULTI_RIG_TARGETS_PER_RIG}
                    {draft ? ` · ${draft.objectIds.length} selected` : ""}
                  </p>
                  <div className="multi-target-source-row">
                    <div
                      className={`sort-menu filter-menu multi-target-filter-menu${filterOpen ? " open" : ""}`}
                      ref={filterHost}
                    >
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
                              role="option"
                              aria-selected={planner.listFilter === filter}
                              className="sort-option"
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
                      onClick={() => setSource({ kind: "favorites" })}
                    >
                      Favorites ({lists.favorites.length})
                    </button>

                    <div
                      className={`sort-menu filter-menu multi-target-filter-menu${listsOpen ? " open" : ""}`}
                      ref={listsHost}
                    >
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
                            <p className="note" style={{ margin: "8px 12px" }}>
                              No saved target lists yet.
                            </p>
                          ) : (
                            lists.lists.map((list) => (
                              <button
                                key={list.id}
                                type="button"
                                role="option"
                                aria-selected={source.kind === "list" && source.listId === list.id}
                                className="sort-option"
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
                    {pickerItems.map((object) => {
                      const isSelected = draft?.objectIds.includes(object.id) ?? false;
                      const atCap = (draft?.objectIds.length ?? 0) >= MULTI_RIG_TARGETS_PER_RIG && !isSelected;
                      return (
                        <MultiTargetPickerThumb
                          key={object.id}
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
                  </div>
                </div>
              ) : null}

              {!draft || draft.objectIds.length === 0 ? (
                <p className="note">
                  {selected ? `Pick up to ${MULTI_RIG_TARGETS_PER_RIG} targets above` : "Tap this card to assign targets"}
                </p>
              ) : (
                <div className="multi-rigs-target-list">
                  {draft.objectIds.map((objectId) => {
                    const object = catalogueById.get(objectId);
                    const result = results.find((item) => item.objectId === objectId) ?? null;
                    const key = hoursKey(rig.id, objectId);
                    const hoursValue =
                      hoursDraft[key] ?? (draft.plannedHours[objectId] ?? result?.plannedHours ?? 2).toFixed(1);
                    return (
                      <div key={objectId} className="multi-rigs-target-block">
                        <p className="multi-rigs-target">{object ? objectTitle(object) : objectId}</p>
                        <div className="single-target-controls">
                          <label>
                            Planned hours
                            <span className="multi-target-budget-controls">
                              <button type="button" className="ghost" onClick={() => nudgeHours(rig.id, objectId, -0.5)}>
                                −
                              </button>
                              <span className="single-target-goal-input">
                                <input
                                  value={hoursValue}
                                  onChange={(event) => onHoursTextChange(rig.id, objectId, event.target.value)}
                                  onBlur={() => commitHoursDraft(rig.id, objectId)}
                                  inputMode="decimal"
                                  aria-label={`${rig.name} ${objectId} planned hours`}
                                />
                                <span>h</span>
                              </span>
                              <button type="button" className="ghost" onClick={() => nudgeHours(rig.id, objectId, 0.5)}>
                                +
                              </button>
                            </span>
                          </label>
                        </div>
                        {result ? (
                          <div className="multi-rigs-stats">
                            <p className="note" style={{ margin: 0 }}>
                              Imageable {formatImageableHours(result.usableHours)} · scheduled{" "}
                              {formatImageableHours(result.allocatedHours)}
                            </p>
                            <p className="multi-target-scheduled" style={{ color }}>
                              {formatIntervals(result.assignedIntervals, planner.site.timezone)}
                            </p>
                            <p className="note" style={{ margin: 0 }}>
                              Frame {result.frameFillPercent == null ? "—" : `${Math.round(result.frameFillPercent)}%`} ·{" "}
                              {frameFitLabel(result.frameFit)} · peak {Math.round(result.maxAltitudeDeg)}°
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {results.length > 0 ? (
                    <div className="multi-rigs-timeline">
                      <strong>Timeline</strong>
                      <p className="note">Bright segments are this rig’s planned windows.</p>
                      <MultiAltitudeChart
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
                    </div>
                  ) : null}
                </div>
              )}

              {filters.length > 0 ? (
                <div className="multi-target-chip-row" role="group" aria-label={`${rig.name} filters`}>
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className="chip"
                      aria-pressed={draft?.filterIds.includes(filter.id) ?? false}
                      onClick={() => toggleFilter(rig.id, filter.id)}
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="note">No filters saved on this rig.</p>
              )}
            </div>
          );
        })}
      </div>

      {plan && plan.conflicts.length > 0 ? (
        <div className="multi-rigs-conflicts">
          <strong>Conflicts</strong>
          {plan.conflicts.map((conflict) => (
            <div key={`${conflict.kind}-${conflict.objectId}`} className="hub-card">
              <strong style={{ color: "var(--clay, #e08a7a)" }}>{conflict.objectName}</strong>
              <p className="note" style={{ marginBottom: 0 }}>
                {conflict.message}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <SavePlanControl
        disabled={activeRigs.length === 0 || !planner.setupReady}
        disabledReason={
          !planner.setupReady
            ? "Set location and gear before saving."
            : "Enable at least one rig with targets to save."
        }
        defaultName={`Multi-rigs ${planner.date}`}
        onSave={(name) => {
          imagingPlans.savePlan({
            name,
            module: "multi-rigs",
            siteRef: snapshotPlanSite(planner),
            pickerSource: source,
            ...planFilterFields(planner, source),
            gear: snapshotPlanGear(planner),
            dateIso: planner.date,
            enabledRigIds,
            rigs: drafts,
          });
        }}
      />
    </div>
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

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 1.5v3M11 1.5v3M2 6.5h12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
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
