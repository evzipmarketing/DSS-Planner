"use client";

import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
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
import { applySavedPlanGear } from "@/lib/apply-plan-gear";
import { consumeAsterismCollageSeed } from "@/lib/asterism-collage-seed";
import { planFilterFields, snapshotPlanGear, snapshotPlanSite } from "@/lib/plan-snapshot";
import { useImagingPlans } from "@/lib/use-imaging-plans";
import { useLists } from "@/lib/use-lists";
import { CollageSkyPreview } from "./collage-sky-preview";
import { ModuleGearPicker } from "./module-gear-picker";
import { SavePlanControl } from "./save-plan-control";
import { usePlannerState } from "./planner-context";

const SERIES_COLORS = ["#7ad0e7", "#e0c07a", "#9ad67a", "#c79ae8", "#e08a7a", "#7ab8e0", "#e0b07a", "#8ad0c0"];

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

export function CollagePanel() {
  const planner = usePlannerState();
  const lists = useLists();
  const imagingPlans = useImagingPlans();
  const datePickerId = useId();
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<PlanPickerSource>({ kind: "filtered" });
  const [ignoreDate, setIgnoreDate] = useState(false);
  const [dateText, setDateText] = useState(() => isoToDisplayDate(planner.date));
  const [filterOpen, setFilterOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [paddingPercent, setPaddingPercent] = useState(10);
  const [showTargetNames, setShowTargetNames] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<string[] | null>(null);
  const [seedGroup, setSeedGroup] = useState<CollageGroupSuggestion | null>(null);
  const filterHost = useRef<HTMLDivElement>(null);
  const listsHost = useRef<HTMLDivElement>(null);
  const framingRef = useRef<HTMLDivElement>(null);
  const [suggestPaneHeight, setSuggestPaneHeight] = useState<number | null>(null);
  useMenuDismiss(filterOpen, filterHost, setFilterOpen);
  useMenuDismiss(listsOpen, listsHost, setListsOpen);

  useEffect(() => {
    if (!planner.optics?.field) return;
    const seed = consumeAsterismCollageSeed();
    if (!seed) return;
    const plan = planCollage({
      targets: seed.targets,
      fov: { widthDeg: planner.optics.field.widthDeg, heightDeg: planner.optics.field.heightDeg },
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
    // Intentionally one-shot when optics become ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planner.optics?.field]);

  useEffect(() => {
    setDateText(isoToDisplayDate(planner.date));
  }, [planner.date]);

  useEffect(() => {
    if (!imagingPlans.ready) return;
    const plan = imagingPlans.consumePendingPlan("collage");
    if (!plan || plan.module !== "collage") return;
    applySavedPlanGear(planner, plan);
    const hydrated = normalizeHydratedSource(plan.pickerSource);
    setSource(hydrated.source);
    setIgnoreDate(plan.ignoreDate ?? hydrated.ignoreDate);
    if (plan.dateIso) planner.setDate(plan.dateIso);
    setPaddingPercent(plan.paddingPercent);
    setPendingIds(plan.selectedObjectIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when plans are ready
  }, [imagingPlans.ready]);

  const catalogueById = useMemo(() => {
    const map = new Map((planner.catalogue ?? []).map((item) => [item.id, item]));
    for (const item of planner.shortlist) map.set(item.object.id, item.object);
    return map;
  }, [planner.catalogue, planner.shortlist]);

  const field = planner.optics?.field ?? null;
  const todayIso = civilDate(planner.site.timezone);

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
        return "No favorites yet. Star targets from Tonight detail.";
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

  useEffect(() => {
    const framing = framingRef.current;
    if (!framing || !selectedGroup) {
      setSuggestPaneHeight(null);
      return;
    }
    const syncHeight = () => {
      setSuggestPaneHeight(Math.round(framing.getBoundingClientRect().height));
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(framing);
    window.addEventListener("resize", syncHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [selectedGroup, selectedGroupId]);

  const colorById = useMemo(() => {
    const map = new Map<string, string>();
    selectedGroup?.targetIds.forEach((id, index) => {
      map.set(id, SERIES_COLORS[index % SERIES_COLORS.length]!);
    });
    return map;
  }, [selectedGroup]);

  function chooseFilter(filter: TargetListFilter) {
    planner.setListFilter(filter);
    setSource({ kind: "filtered" });
    setFilterOpen(false);
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

  return (
    <div className="collage-panel">
      <p className="note" style={{ marginTop: 0 }}>
        DeepSkyMate suggests multi-target groups that fit your FOV. Use filters such as Narrowband with or without a
        specific night.
      </p>

      <ModuleGearPicker />

      {!field ? (
        <p className="note">Choose a saved rig or pick a telescope and camera above to continue.</p>
      ) : (
        <>
          <div className={`hub-card multi-target-date-card${ignoreDate ? " is-muted" : ""}`}>
            <div className="date-nav-row collage-date-nav-row">
              <label className="collage-ignore-date" htmlFor={`${datePickerId}-ignore-date`}>
                <input
                  id={`${datePickerId}-ignore-date`}
                  type="checkbox"
                  checked={ignoreDate}
                  onChange={(event) => setIgnoreDate(event.target.checked)}
                />
                <span>Ignore date</span>
              </label>
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
                    disabled={ignoreDate}
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
                    disabled={ignoreDate}
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
                    disabled={ignoreDate}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      pickDate(event.target.value);
                    }}
                  />
                </span>
              </label>
              <div className="day-row">
                <button
                  type="button"
                  className="day"
                  disabled={ignoreDate}
                  onClick={() => pickDate(addDaysIso(planner.date, -1))}
                >
                  Previous day
                </button>
                <button
                  type="button"
                  className="day"
                  disabled={ignoreDate}
                  aria-pressed={planner.date === todayIso}
                  onClick={() => pickDate(todayIso)}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="day"
                  disabled={ignoreDate}
                  onClick={() => pickDate(addDaysIso(planner.date, 1))}
                >
                  Next day
                </button>
              </div>
            </div>
            {ignoreDate ? (
              <p className="note" style={{ margin: 0 }}>
                Date / moon ignored — filters like Narrowband still apply for creative FOV framing.
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

          {candidateObjects.length < 2 ? (
            <p className="note">{emptyPoolMessage}</p>
          ) : suggestions.length === 0 ? (
            <div className="hub-card">
              <strong>No collage groups in this FOV</strong>
              <p className="note" style={{ margin: "6px 0 10px" }}>
                Searched {candidateObjects.length} targets from the selected pool. Try a wider scope, lower padding, or
                a different filter / list.
              </p>
              <FramingToolbar
                paddingPercent={paddingPercent}
                setPaddingPercent={setPaddingPercent}
                showTargetNames={showTargetNames}
                setShowTargetNames={setShowTargetNames}
              />
            </div>
          ) : (
            <div className="collage-workspace">
              <div
                className="hub-card collage-suggest-pane"
                style={suggestPaneHeight != null ? { height: suggestPaneHeight } : undefined}
              >
                <div className="collage-pane-head">
                  <strong>Suggested collages</strong>
                  <p className="note" style={{ margin: "4px 0 0" }}>
                    {suggestions.length} group{suggestions.length === 1 ? "" : "s"} fit in {field.widthDeg.toFixed(2)}° ×{" "}
                    {field.heightDeg.toFixed(2)}°
                    {ignoreDate && source.kind === "filtered" ? " · date ignored" : ""}.
                  </p>
                </div>
                <ul className="collage-suggest-list">
                  {suggestions.map((group) => {
                    const active = group.id === selectedGroupId;
                    const names = group.plan.targets.map((target) => target.name).join(" · ");
                    return (
                      <li key={group.id}>
                        <button
                          type="button"
                          className={`collage-suggest-btn${active ? " is-active" : ""}`}
                          aria-pressed={active}
                          onClick={() => setSelectedGroupId(group.id)}
                        >
                          <strong>
                            {group.targetIds.length} targets · {group.plan.requiredWidthDeg.toFixed(2)}° ×{" "}
                            {group.plan.requiredHeightDeg.toFixed(2)}°
                          </strong>
                          <span className="note">{names}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {selectedGroup ? (
                <div className="hub-card collage-summary" ref={framingRef}>
                  <div className="collage-pane-head">
                    <strong>Framing</strong>
                    <p className="note" style={{ margin: "4px 0 0" }}>
                      {selectedGroup.plan.hint} · {formatRightAscension(selectedGroup.plan.center.raDeg)} ·{" "}
                      {formatDeclination(selectedGroup.plan.center.decDeg)} · rot{" "}
                      {selectedGroup.plan.rotationDeg.toFixed(0)}°
                    </p>
                  </div>
                  <CollageSkyPreview
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
                  />
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      <SavePlanControl
        disabled={!selectedGroup || !planner.setupReady}
        disabledReason={
          !planner.setupReady ? "Set location and gear before saving." : "Pick a suggested collage group to save."
        }
        defaultName={
          selectedGroup
            ? `Collage · ${selectedGroup.targetIds.length} targets`
            : "Collage plan"
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
    </div>
  );
}

function FramingToolbar({
  paddingPercent,
  setPaddingPercent,
  showTargetNames,
  setShowTargetNames,
}: {
  paddingPercent: number;
  setPaddingPercent: (value: number | ((prev: number) => number)) => void;
  showTargetNames: boolean;
  setShowTargetNames: (value: boolean | ((prev: boolean) => boolean)) => void;
}) {
  return (
    <div className="collage-framing-toolbar">
      <div className="collage-controls collage-padding-row">
        <strong>Padding</strong>
        <div className="multi-target-budget-controls" style={{ justifyContent: "flex-start", gap: 10 }}>
          <button
            type="button"
            className="ghost"
            aria-label="Decrease padding"
            onClick={() => setPaddingPercent((value) => Math.max(0, value - 5))}
          >
            −
          </button>
          <span>{paddingPercent}%</span>
          <button
            type="button"
            className="ghost"
            aria-label="Increase padding"
            onClick={() => setPaddingPercent((value) => Math.min(40, value + 5))}
          >
            +
          </button>
        </div>
      </div>
      <label className="collage-ignore-date collage-show-names">
        <input
          type="checkbox"
          checked={showTargetNames}
          onChange={(event) => setShowTargetNames(event.target.checked)}
        />
        <span>Targets</span>
      </label>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10h17" />
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
