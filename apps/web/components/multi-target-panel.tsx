"use client";

import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
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
import { useLists } from "@/lib/use-lists";
import { MultiAltitudeChart } from "./multi-altitude-chart";
import { MultiTargetPickerThumb } from "./multi-target-picker-thumb";
import { usePlannerState } from "./planner-context";

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

export function MultiTargetPanel() {
  const planner = usePlannerState();
  const lists = useLists();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [strategy, setStrategy] = useState<MultiTargetStrategy>("peak-first");
  const [filterOpen, setFilterOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [source, setSource] = useState<PickerSource>({ kind: "filtered" });
  const filterHost = useRef<HTMLDivElement>(null);
  const listsHost = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);
  const datePickerId = useId();
  const [dateText, setDateText] = useState(() => isoToDisplayDate(planner.date));
  useMenuDismiss(filterOpen, filterHost, setFilterOpen);
  useMenuDismiss(listsOpen, listsHost, setListsOpen);

  useEffect(() => {
    setDateText(isoToDisplayDate(planner.date));
  }, [planner.date]);

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
  const todayIso = civilDate(planner.site.timezone);

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

  const filterChipLabel =
    planner.listFilter === "custom" && customListRangesActive(planner.customListRanges)
      ? `Custom · ${Math.round(planner.customListRanges.minFrameFillPercent)}–${Math.round(planner.customListRanges.maxFrameFillPercent)}%`
      : listFilterLabel(planner.listFilter);

  const listsChipLabel =
    source.kind === "list" ? `${source.listName} (${lists.lists.find((list) => list.id === source.listId)?.items.length ?? 0})` : "Lists";

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

  function pickDate(next: string) {
    planner.setDate(next);
    setDateText(isoToDisplayDate(next));
  }

  function commitDateText(next: string) {
    setDateText(next);
    const iso = displayToIsoDate(next);
    if (!iso) return;
    planner.setDate(iso);
  }

  if (!planner.setupReady) {
    return (
      <div className="multi-target-panel">
        <p className="note" style={{ marginTop: 0 }}>
          Finish location, date, telescope, and camera in Tonight settings first.
        </p>
      </div>
    );
  }

  return (
    <div className="multi-target-panel">
      <p className="note" style={{ marginTop: 0 }}>
        Pick up to {MULTI_TARGET_MAX} targets for one night. Windows use the active site and optics; shoot slots never
        overlap. Broadband targets warn when the Moon is bright.
      </p>

      <div className="hub-card multi-target-date-card">
        <div className="date-nav-row">
          <strong className="date-nav-label">Night</strong>
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
            <button
              type="button"
              className="day"
              aria-pressed={planner.date === todayIso}
              onClick={() => pickDate(todayIso)}
            >
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

      <div className="multi-target-source-row">
        <div className={`sort-menu filter-menu multi-target-filter-menu${filterOpen ? " open" : ""}`} ref={filterHost}>
          <button
            type="button"
            className="tab sort-tab"
            aria-expanded={filterOpen}
            aria-haspopup="listbox"
            aria-controls="multi-target-filter"
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
            <div className="sort-panel sort-panel-left" id="multi-target-filter" role="listbox" aria-label="Filter targets">
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
            aria-controls="multi-target-lists"
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
            <div className="sort-panel sort-panel-left" id="multi-target-lists" role="listbox" aria-label="Saved lists">
              {lists.lists.length === 0 ? (
                <p className="note" style={{ margin: "8px 10px" }}>
                  No saved lists yet.
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

      {pickerItems.length === 0 ? (
        <p className="note">{emptyPickerMessage}</p>
      ) : (
        <div className="multi-target-thumb-scroller" role="group" aria-label="Targets">
          {pickerItems.map((object) => {
            const active = selectedIds.includes(object.id);
            const full = !active && selectedIds.length >= MULTI_TARGET_MAX;
            const label = primaryDesignation(object) || objectTitle(object);
            return (
              <MultiTargetPickerThumb
                key={object.id}
                raDeg={object.raDeg}
                decDeg={object.decDeg}
                majorArcmin={object.majorArcmin}
                label={label}
                selected={active}
                disabled={full}
                accent={colorById.get(object.id) ?? "var(--accent)"}
                onPress={() => toggleTarget(object.id)}
              />
            );
          })}
        </div>
      )}
      <p className="note">
        {selectedIds.length}/{MULTI_TARGET_MAX} selected · scroll for more
      </p>

      {orderedTracks.length >= 1 ? (
        <div className="hub-card multi-target-chart-card">
          <strong>Shared altitude</strong>
          <p className="note" style={{ margin: 0 }}>
            Bright segments are the scheduled shoot windows in order.
          </p>
          <MultiAltitudeChart
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
        </div>
      ) : null}

      {orderedTracks.length >= 1 ? (
        <div className="multi-target-budgets">
          <strong>Hour budgets · shoot order</strong>
          {orderedTracks.length >= 2 ? (
            <div className="multi-target-chip-row" role="group" aria-label="Auto-sort shoot order">
              {STRATEGIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="chip"
                  aria-pressed={strategy === item.id}
                  onClick={() => applyStrategy(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          {orderedTracks.map((item, index) => {
            const id = item.object.id;
            const hours = budgets[id] ?? 0;
            const assignment = assignmentById.get(id);
            const moon = moonById.get(id);
            return (
              <div key={id} className="hub-card multi-target-budget-row">
                <div className="multi-target-budget-head">
                  <div>
                    <strong>
                      {index + 1}. {objectTitle(item.object)}
                    </strong>
                    <p className="note" style={{ margin: "4px 0 0" }}>
                      {bandLabel(item.band)} · Imageable {formatImageableHours(item.track.usableHours)} · peak{" "}
                      {Math.round(item.track.maxTargetAltitude)}°
                      {item.track.maxTargetTime
                        ? ` at ${formatClock(item.track.maxTargetTime, planner.site.timezone)}`
                        : ""}
                    </p>
                    {moon?.hint ? <p className="multi-target-moon-hint">{moon.hint}</p> : null}
                    {assignment && assignment.allocatedHours > 0 ? (
                      <p className="note multi-target-scheduled" style={{ color: colorById.get(id) ?? undefined }}>
                        Scheduled {formatImageableHours(assignment.allocatedHours)} ·{" "}
                        {assignment.assignedIntervals
                          .map(
                            (interval) =>
                              `${formatClock(interval.start, planner.site.timezone)}–${formatClock(interval.end, planner.site.timezone)}`,
                          )
                          .join(", ")}
                      </p>
                    ) : (
                      <p className="note" style={{ margin: "4px 0 0" }}>
                        No free window for this duration in the current order.
                      </p>
                    )}
                  </div>
                  <div className="multi-target-order-controls">
                    <button
                      type="button"
                      className="ghost"
                      aria-label="Move earlier in shoot order"
                      disabled={index === 0}
                      onClick={() => moveTarget(id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      aria-label="Move later in shoot order"
                      disabled={index === orderedTracks.length - 1}
                      onClick={() => moveTarget(id, 1)}
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <div className="multi-target-budget-controls">
                  <button type="button" className="ghost" onClick={() => nudgeBudget(id, -0.5)} aria-label="Decrease hours">
                    −
                  </button>
                  <span>{hours.toFixed(1)} h</span>
                  <button type="button" className="ghost" onClick={() => nudgeBudget(id, 0.5)} aria-label="Increase hours">
                    +
                  </button>
                  <button type="button" className="ghost" onClick={() => toggleTarget(id)}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="note">Select targets above to set hour budgets and shoot order.</p>
      )}
    </div>
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

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10h17" />
    </svg>
  );
}
