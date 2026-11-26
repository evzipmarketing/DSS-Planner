"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
import { applySavedPlanGear } from "@/lib/apply-plan-gear";
import { planFilterFields, snapshotPlanGear, snapshotPlanSite } from "@/lib/plan-snapshot";
import { useImagingPlans } from "@/lib/use-imaging-plans";
import { useLists } from "@/lib/use-lists";
import { ModuleGearPicker } from "./module-gear-picker";
import { MosaicSkyPreview } from "./mosaic-sky-preview";
import { MultiTargetPickerThumb } from "./multi-target-picker-thumb";
import { SavePlanControl } from "./save-plan-control";
import { usePlannerState } from "./planner-context";

type PickerSource =
  | { kind: "filtered" }
  | { kind: "favorites" }
  | { kind: "list"; listId: string; listName: string };

const DEFAULT_ROWS = 2;
const DEFAULT_COLS = 2;
const DEFAULT_OVERLAP = 10;
const DEFAULT_ROTATION = 0;

export function MosaicPanel() {
  const planner = usePlannerState();
  const lists = useLists();
  const imagingPlans = useImagingPlans();
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
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const filterHost = useRef<HTMLDivElement>(null);
  const listsHost = useRef<HTMLDivElement>(null);
  const skipCenterReset = useRef(false);
  useMenuDismiss(filterOpen, filterHost, setFilterOpen);
  useMenuDismiss(listsOpen, listsHost, setListsOpen);

  useEffect(() => {
    if (!imagingPlans.ready) return;
    const plan = imagingPlans.consumePendingPlan("mosaic");
    if (!plan || plan.module !== "mosaic") return;
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

  async function copyText(text: string, okLabel: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(okLabel);
    } catch {
      setCopyStatus("Could not copy.");
    }
  }

  async function copyAll() {
    if (!plan || !selected) return;
    const header = `${objectTitle(selected)} · ${plan.rows}×${plan.cols} mosaic · ${plan.overlapPercent}% overlap · rot ${plan.rotationDeg}°`;
    await copyText(`${header}\n${formatMosaicCoordsList(plan)}`, "All panel coordinates copied.");
  }

  async function copyPanel(panel: MosaicPanel) {
    await copyText(formatMosaicPanelCoords(panel), `${panel.label} copied.`);
  }

  if (!planner.locationReady || !planner.date) {
    return (
      <div className="mosaic-panel">
        <p className="note" style={{ marginTop: 0 }}>
          Set location and date in Tonight settings first.
        </p>
      </div>
    );
  }

  return (
    <div className="mosaic-panel">
      <p className="note" style={{ marginTop: 0 }}>
        Drag the mosaic grid on the sky plate to frame the target. Adjust rows, columns, overlap, and rotation; copy
        panel centers when ready.
      </p>

      <ModuleGearPicker />

      {!field ? (
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

      {selected && plan && mosaicCenter ? (
        <>
          <div className="mosaic-workspace">
            <MosaicSkyPreview
              object={selected}
              plan={plan}
              center={mosaicCenter}
              onCenterChange={setMosaicCenter}
              rotationDeg={rotationDeg}
              onRotationChange={setRotationDeg}
              zoom={zoom}
            />

            <div className="hub-card mosaic-summary">
              <strong>{objectTitle(selected)}</strong>
              <div className="mosaic-controls">
                <Stepper
                  label="Rows"
                  value={String(rows)}
                  onMinus={() => setRows((prev) => clampDim(prev - 1))}
                  onPlus={() => setRows((prev) => clampDim(prev + 1))}
                />
                <Stepper
                  label="Columns"
                  value={String(cols)}
                  onMinus={() => setCols((prev) => clampDim(prev - 1))}
                  onPlus={() => setCols((prev) => clampDim(prev + 1))}
                />
                <Stepper
                  label="Overlap"
                  value={`${overlapPercent}%`}
                  onMinus={() => setOverlapPercent((prev) => clampOverlap(prev - 5))}
                  onPlus={() => setOverlapPercent((prev) => clampOverlap(prev + 5))}
                />
                <Stepper
                  label="Rotation"
                  value={`${Math.round(rotationDeg)}°`}
                  onMinus={() => setRotationDeg((prev) => wrapRotation(prev - 5))}
                  onPlus={() => setRotationDeg((prev) => wrapRotation(prev + 5))}
                />
                <Stepper
                  label="Zoom"
                  value={`${Math.round(zoom * 100)}%`}
                  onMinus={() => setZoom((prev) => clampMosaicZoom(prev - MOSAIC_ZOOM_STEP))}
                  onPlus={() => setZoom((prev) => clampMosaicZoom(prev + MOSAIC_ZOOM_STEP))}
                />
              </div>

              <p className="mosaic-progress">
                {plan.rows}×{plan.cols} · {plan.panelCount} panels
                {plan.coveragePercent != null ? ` · object ~${Math.round(plan.coveragePercent)}% of mosaic` : ""}
              </p>
              <p className={`note${plan.undersampled ? " mosaic-warn" : ""}`} style={{ margin: 0 }}>
                {plan.coverageHint}
              </p>

              <div className="mosaic-actions" role="group" aria-label="Mosaic actions">
                <button
                  type="button"
                  className="chip"
                  onClick={() => setMosaicCenter({ raDeg: selected.raDeg, decDeg: selected.decDeg })}
                >
                  Recenter
                </button>
                <button type="button" className="chip" onClick={() => void copyAll()}>
                  Copy all
                </button>
                <button type="button" className="chip" onClick={() => setShowCoords((open) => !open)}>
                  {showCoords ? "Hide list" : "Panel list"}
                </button>
              </div>
              {copyStatus ? (
                <span className="note mosaic-actions-status" style={{ margin: 0 }}>
                  {copyStatus}
                </span>
              ) : null}
            </div>
          </div>

          {showCoords ? (
            <div className="mosaic-panels">
              <strong>Panel coordinates</strong>
              <ul className="mosaic-panel-list">
                {plan.panels.map((panel) => (
                  <li key={panel.label} className="hub-card mosaic-panel-row">
                    <MultiTargetPickerThumb
                      raDeg={panel.raDeg}
                      decDeg={panel.decDeg}
                      majorArcmin={null}
                      fovDeg={panelFovDeg ?? undefined}
                      label={panel.label}
                      selected={false}
                      accent="var(--accent)"
                      onPress={() => void copyPanel(panel)}
                    />
                    <div className="mosaic-panel-meta">
                      <strong>
                        {panel.label} · row {panel.row + 1}, col {panel.col + 1}
                      </strong>
                      <code>
                        {formatRightAscension(panel.raDeg)}
                        <br />
                        {formatDeclination(panel.decDeg)}
                      </code>
                      <button type="button" className="ghost" onClick={() => void copyPanel(panel)}>
                        Copy coords
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="note">Pick a target to build a mosaic grid for the active FOV.</p>
      )}
      </>
      )}

      <SavePlanControl
        disabled={!selectedId || !mosaicCenter || !planner.setupReady}
        disabledReason={!planner.setupReady ? "Set location and gear before saving." : "Select a target to save."}
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
    </div>
  );
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <label className="mosaic-stepper">
      {label}
      <span className="multi-target-budget-controls">
        <button type="button" className="ghost" onClick={onMinus} aria-label={`Decrease ${label}`}>
          −
        </button>
        <span className="mosaic-stepper-value">{value}</span>
        <button type="button" className="ghost" onClick={onPlus} aria-label={`Increase ${label}`}>
          +
        </button>
      </span>
    </label>
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
