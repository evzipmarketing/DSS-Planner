"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  ASTRONOMICAL_SUN_ALTITUDE_DEG,
  CATALOGUE_IDS,
  DEEP_SKY_TYPES,
  IMAGEABLE_MIN_ALTITUDE_DEG,
  TARGET_LIST_FILTERS,
  TARGET_SORT_KEYS,
  bandAdvice,
  bandLabel,
  catalogueLabel,
  compareTargetSort,
  defaultSortDirection,
  frameFillPercent,
  formatArcmin,
  formatCatalogueId,
  formatClock,
  formatDeclination,
  formatImageableHours,
  formatRightAscension,
  formatSignedDegrees,
  listFilterLabel,
  targetSortLabel,
  type SortDirection,
  type TargetSortKey,
  objectTitle,
  primaryDesignation,
  objectTypeLabel,
  type CatalogueId,
  type DeepSkyObject,
  type DeepSkyType,
  type RankedTarget,
} from "@dss/core";
import { constellationName } from "@dss/data";
import { useLists } from "@/lib/use-lists";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

export function Shortlist({ detail }: { detail?: ReactNode }) {
  const {
    shortlist,
    scoring,
    catalogue,
    selected,
    chooseTarget,
    extendedReady,
    listFilter,
    setListFilter,
    listSort,
    setListSort,
    listSortDirection,
    setListSortDirection,
    query,
    setQuery,
    results,
    focusTarget,
    optics,
    track,
  } = usePlannerState();
  const [shown, setShown] = useState(20);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const ordered = useMemo(
    () =>
      [...shortlist].sort((a, b) =>
        compareTargetSort(
          {
            id: a.object.id,
            frameFit: a.frameFit,
            usableHours: a.usableHours,
            moonScore: a.moonScore,
            visibility: a.visibility,
            catalogueRank: a.catalogueRank,
            frameFillPercent: a.frameFillPercent,
            imageableAtDusk: a.imageableAtDusk,
            imageableRise: a.imageableRise,
          },
          {
            id: b.object.id,
            frameFit: b.frameFit,
            usableHours: b.usableHours,
            moonScore: b.moonScore,
            visibility: b.visibility,
            catalogueRank: b.catalogueRank,
            frameFillPercent: b.frameFillPercent,
            imageableAtDusk: b.imageableAtDusk,
            imageableRise: b.imageableRise,
          },
          listSort,
          listSortDirection,
        ),
      ),
    [shortlist, listSort, listSortDirection],
  );
  const visible = ordered.slice(0, shown);
  const field = optics
    ? { widthArcmin: optics.field.widthArcmin, heightArcmin: optics.field.heightArcmin }
    : null;
  const pinned = pinnedRow(pinnedId, catalogue, shortlist, field, selected?.id === pinnedId ? (track?.usableHours ?? null) : null);

  function selectResult(object: (typeof results)[number]) {
    setPinnedId(object.id);
    setQuery(objectTitle(object));
    focusTarget(object.id);
  }

  function clearSearch() {
    setPinnedId(null);
    setQuery("");
    focusTarget(null);
  }

  return (
    <Section index="06" title="Tonight's targets" hideHeading>
      <div className="list-tools list-tools-compact">
        <ListFilter
          filter={listFilter}
          onFilter={(next) => {
            setListFilter(next);
            setShown(20);
          }}
        />
        <CustomFilters />
        <ListSort
          sortKey={listSort}
          direction={listSortDirection}
          onKey={(next) => {
            setListSort(next);
            setListSortDirection(defaultSortDirection(next));
            setShown(20);
          }}
          onDirection={(next) => {
            setListSortDirection(next);
            setShown(20);
          }}
        />
        <ListSearch
          query={query}
          pinned={Boolean(pinnedId)}
          onQuery={(next) => {
            setQuery(next);
            setPinnedId(null);
          }}
          onClear={clearSearch}
          onSubmit={() => {
            if (!pinnedId && results[0]) selectResult(results[0]);
          }}
        />
      </div>
      {pinnedId ? (
        <button type="button" className="show-all" onClick={clearSearch}>
          Show all targets
        </button>
      ) : null}
      {!catalogue ? <p className="note">Loading the deep-sky catalogue…</p> : null}
      {pinnedId ? null : (
      <div className="rows">
        {results.map((object) => (
          <button key={object.id} type="button" className="row" onClick={() => selectResult(object)}>
            <span className="row-index">{primaryDesignation(object)}</span>
            <span>
              <strong>{objectTitle(object)}</strong>
              <small>
                {objectTypeLabel(object.type)}
                {object.constellation ? ` · ${constellationName(object.constellation)}` : ""}
              </small>
            </span>
            <span className="meta">{object.magnitude == null ? "—" : object.magnitude.toFixed(1)}</span>
          </button>
        ))}
      </div>
      )}
      {!pinnedId && catalogue && query.trim() && results.length === 0 ? (
        <p className="note">
          {extendedReady ? "No match in the loaded catalogues." : "No match in the core list yet. The extended catalogues are still loading."}
        </p>
      ) : null}
      {!pinned && (!catalogue || scoring) ? <p className="note">Scoring objects for this site, date, and rig…</p> : null}
      {!pinned && catalogue && !scoring && shortlist.length === 0 ? (
        <p className="note">Nothing in this view clears the horizon. Try another night, site, or filter.</p>
      ) : null}
      <div className="rows">
        {(pinned ? [pinned] : visible).map((item) => (
          <TargetRow
            key={item.object.id}
            item={item}
            expanded={pinned != null || selected?.id === item.object.id}
            onToggle={() => {
              if (pinned) return;
              chooseTarget(item.object.id);
            }}
            detail={detail}
          />
        ))}
      </div>
      {!pinned && shortlist.length > shown ? (
        <button type="button" className="ghost show-more" onClick={() => setShown((count) => count + 20)}>
          Show more
        </button>
      ) : null}
    </Section>
  );
}

type ListedTarget = Pick<RankedTarget, "object" | "frameFillPercent" | "usableHours" | "band">;

function pinnedRow(
  pinnedId: string | null,
  catalogue: DeepSkyObject[] | null,
  shortlist: RankedTarget[],
  field: { widthArcmin: number; heightArcmin: number } | null,
  usableHours: number | null,
): ListedTarget | null {
  if (!pinnedId || !catalogue) return null;
  const ranked = shortlist.find((item) => item.object.id === pinnedId);
  if (ranked) return ranked;
  const object = catalogue.find((item) => item.id === pinnedId);
  if (!object) return null;
  return {
    object,
    frameFillPercent: frameFillPercent(object.majorArcmin, field),
    usableHours: usableHours ?? 0,
    band: bandAdvice(object.type),
  };
}

function TargetRow({
  item,
  expanded,
  onToggle,
  detail,
}: {
  item: ListedTarget;
  expanded: boolean;
  onToggle: () => void;
  detail?: ReactNode;
}) {
  return (
    <div className="target-slot">
      <div
        className="target"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        <span className="target-top">
          <TargetThumb
            raDeg={item.object.raDeg}
            decDeg={item.object.decDeg}
            majorArcmin={item.object.majorArcmin}
            name={objectTitle(item.object)}
            typeLabel={objectTypeLabel(item.object.type)}
            magnitude={item.object.magnitude}
          />
          <span className="target-copy">
            <span className="target-title">
              <strong>{objectTitle(item.object)}</strong>
              <span className="tag">{bandLabel(item.band)}</span>
            </span>
            <span className="target-sub">
              {primaryDesignation(item.object)} · {objectTypeLabel(item.object.type)}
            </span>
          </span>
        </span>
        <span className="target-facts">
          <Fact
            label="Frame"
            value={item.frameFillPercent == null ? "—" : `${Math.round(item.frameFillPercent)}%`}
            tip="How much of the sensor the object fills, from its catalogued size and the current telescope, corrector, and camera."
          />
          <Fact
            label="Imageable"
            value={formatImageableHours(item.usableHours)}
            tip={`Hours tonight when the object is at least ${IMAGEABLE_MIN_ALTITUDE_DEG}° up, the sun is below −${Math.abs(ASTRONOMICAL_SUN_ALTITUDE_DEG)}°, and the Moon is acceptable for this target’s band (broadband skips bright-Moon time).`}
          />
        </span>
      </div>
      {expanded && detail ? <div className="inline-detail">{detail}</div> : null}
    </div>
  );
}

function useMenuDismiss(open: boolean, host: RefObject<HTMLElement | null>, setOpen: (open: boolean) => void) {
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!host.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, host, setOpen]);
}

function ListFilter({
  filter,
  onFilter,
}: {
  filter: (typeof TARGET_LIST_FILTERS)[number];
  onFilter: (filter: (typeof TARGET_LIST_FILTERS)[number]) => void;
}) {
  const [open, setOpen] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  useMenuDismiss(open, host, setOpen);

  return (
    <div className={`sort-menu filter-menu${open ? " open" : ""}`} ref={host}>
      <button
        type="button"
        className="tab sort-tab"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="target-filter"
        onClick={() => setOpen((current) => !current)}
      >
        {listFilterLabel(filter)}
        <svg className="custom-chevron" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 6l4.5 4.5L12.5 6" />
        </svg>
      </button>
      {open ? (
        <div className="sort-panel sort-panel-left" id="target-filter" role="listbox" aria-label="Filter targets">
          {TARGET_LIST_FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              className="sort-option"
              role="option"
              aria-selected={key === filter}
              onClick={() => {
                onFilter(key);
                setOpen(false);
              }}
            >
              {listFilterLabel(key)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ListSearch({
  query,
  pinned,
  onQuery,
  onClear,
  onSubmit,
}: {
  query: string;
  pinned: boolean;
  onQuery: (value: string) => void;
  onClear: () => void;
  onSubmit: () => void;
}) {
  const [open, setOpen] = useState(() => Boolean(query) || pinned);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query || pinned) setOpen(true);
  }, [query, pinned]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className={`list-search${open ? " open" : ""}`}>
      {open ? (
        <label className="field search-field list-search-field">
          <span className="visually-hidden">Name or catalogue id</span>
          <span className="search-input">
            <input
              ref={inputRef}
              value={query}
              placeholder="e.g. M42, NGC 224"
              onChange={(event) => onQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  if (query || pinned) onClear();
                  else setOpen(false);
                }
              }}
            />
            {query || pinned ? (
              <button type="button" className="search-clear" aria-label="Clear search and show all targets" onClick={onClear}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            ) : (
              <button type="button" className="search-clear" aria-label="Hide search" onClick={() => setOpen(false)}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            )}
          </span>
        </label>
      ) : (
        <button
          type="button"
          className="tab search-toggle"
          aria-label="Search targets"
          title="Search"
          onClick={() => setOpen(true)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.2" />
            <path d="M10.2 10.2L13.5 13.5" />
          </svg>
        </button>
      )}
    </div>
  );
}

function ListSort({
  sortKey,
  direction,
  onKey,
  onDirection,
}: {
  sortKey: TargetSortKey;
  direction: SortDirection;
  onKey: (key: TargetSortKey) => void;
  onDirection: (direction: SortDirection) => void;
}) {
  const [open, setOpen] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  useMenuDismiss(open, host, setOpen);

  return (
    <div className="list-sort">
      <div className={`sort-menu${open ? " open" : ""}`} ref={host}>
        <button
          type="button"
          className="tab sort-tab"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls="target-sort"
          onClick={() => setOpen((current) => !current)}
        >
          {targetSortLabel(sortKey)}
          <svg className="custom-chevron" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 6l4.5 4.5L12.5 6" />
          </svg>
        </button>
        {open ? (
          <div className="sort-panel" id="target-sort" role="listbox" aria-label="Sort targets">
            {TARGET_SORT_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className="sort-option"
                role="option"
                aria-selected={key === sortKey}
                onClick={() => {
                  onKey(key);
                  setOpen(false);
                }}
              >
                {targetSortLabel(key)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="tab sort-dir"
        aria-label={direction === "asc" ? "Sorting ascending. Switch to descending." : "Sorting descending. Switch to ascending."}
        title={direction === "asc" ? "Ascending" : "Descending"}
        onClick={() => onDirection(direction === "asc" ? "desc" : "asc")}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          {direction === "asc" ? <path d="M8 3.2v9.6M4.8 6.4L8 3.2l3.2 3.2" /> : <path d="M8 12.8V3.2M4.8 9.6L8 12.8l3.2-3.2" />}
        </svg>
      </button>
    </div>
  );
}

function customFilterCount(query: { types: readonly unknown[]; catalogues: readonly unknown[]; maxMagnitude: number | null; minSizeArcmin: number | null }): number {
  return query.types.length + query.catalogues.length + (query.maxMagnitude != null ? 1 : 0) + (query.minSizeArcmin != null ? 1 : 0);
}

function CustomFilters() {
  const { targetQuery, setTargetQuery, extendedReady } = usePlannerState();
  const [open, setOpen] = useState(false);
  const host = useRef<HTMLSpanElement>(null);
  const count = customFilterCount(targetQuery);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!host.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className={`custom-filter${open ? " open" : ""}`} ref={host}>
      <button
        type="button"
        className="tab custom-tab"
        aria-expanded={open}
        aria-controls="custom-filters"
        aria-label={count > 0 ? `Custom filters, ${count} active` : "Custom filters"}
        onClick={() => setOpen((current) => !current)}
      >
        Custom
        {count > 0 ? <span className="custom-count">{count}</span> : null}
        <svg className="custom-chevron" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 6l4.5 4.5L12.5 6" />
        </svg>
      </button>
      {open ? (
        <div className="custom-panel" id="custom-filters" role="region" aria-label="Custom filters">
          <div className="fields">
            <label className="field">
              Type
              <select
                multiple
                value={targetQuery.types}
                onChange={(event) => {
                  const types = Array.from(event.target.selectedOptions, (option) => option.value as DeepSkyType);
                  setTargetQuery({ ...targetQuery, types });
                }}
              >
                {DEEP_SKY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {objectTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Magnitude
              <input
                inputMode="decimal"
                placeholder="e.g. 8"
                value={targetQuery.maxMagnitude ?? ""}
                onChange={(event) => {
                  const value = event.target.value.trim();
                  const maxMagnitude = value === "" ? null : Number(value);
                  setTargetQuery({
                    ...targetQuery,
                    maxMagnitude: maxMagnitude != null && Number.isFinite(maxMagnitude) ? maxMagnitude : null,
                  });
                }}
              />
            </label>
            <label className="field">
              Catalogue
              <select
                multiple
                value={targetQuery.catalogues}
                onChange={(event) => {
                  const catalogues = Array.from(event.target.selectedOptions, (option) => option.value as CatalogueId);
                  setTargetQuery({ ...targetQuery, catalogues });
                }}
              >
                {CATALOGUE_IDS.map((catalogueId) => (
                  <option key={catalogueId} value={catalogueId}>
                    {catalogueLabel(catalogueId)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Size
              <input
                inputMode="decimal"
                placeholder="e.g. 10"
                value={targetQuery.minSizeArcmin ?? ""}
                onChange={(event) => {
                  const value = event.target.value.trim();
                  const minSizeArcmin = value === "" ? null : Number(value);
                  setTargetQuery({
                    ...targetQuery,
                    minSizeArcmin: minSizeArcmin != null && Number.isFinite(minSizeArcmin) ? minSizeArcmin : null,
                  });
                }}
              />
            </label>
          </div>
          <p className="custom-hint">
            Leave these empty for the usual shortlist. Hold Ctrl or Command to pick more than one type or catalogue.
            {!extendedReady ? " The extended catalogues are still loading." : ""}
          </p>
        </div>
      ) : null}
    </span>
  );
}

function Fact({ label, value, tip }: { label: string; value: string; tip: string }) {
  return (
    <span className="fact">
      <span className="fact-label">{label}</span>
      <span className="fact-value">{value}</span>
      <span className="fact-tip" role="tooltip">
        {tip}
      </span>
    </span>
  );
}

const THUMB_SLOTS = 4;
let thumbActive = 0;
const thumbWaiters: Array<() => void> = [];

function acquireThumb(): Promise<void> {
  if (thumbActive < THUMB_SLOTS) {
    thumbActive += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    thumbWaiters.push(() => {
      thumbActive += 1;
      resolve();
    });
  });
}

function releaseThumb(): void {
  thumbActive = Math.max(0, thumbActive - 1);
  thumbWaiters.shift()?.();
}

function skySrc(
  raDeg: number,
  decDeg: number,
  majorArcmin: number | null,
  size: number,
  padding = 1.8,
): string {
  const fov = Math.min(6, Math.max(0.12, ((majorArcmin ?? 15) / 60) * padding));
  return `/api/sky?ra=${raDeg.toFixed(4)}&dec=${decDeg.toFixed(4)}&fov=${fov.toFixed(3)}&size=${size}`;
}

function TargetThumb({
  raDeg,
  decDeg,
  majorArcmin,
  name,
  typeLabel,
  magnitude,
}: {
  raDeg: number;
  decDeg: number;
  majorArcmin: number | null;
  name: string;
  typeLabel: string;
  magnitude: number | null;
}) {
  const host = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<"wait" | "show" | "empty">("wait");
  const [preview, setPreview] = useState(false);
  const src = skySrc(raDeg, decDeg, majorArcmin, 96);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void loadThumb();
      },
      { rootMargin: "280px" },
    );
    observer.observe(node);

    async function loadThumb(): Promise<void> {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        await acquireThumb();
        if (cancelled) {
          releaseThumb();
          return;
        }
        const ok = await probeImage(src);
        releaseThumb();
        if (cancelled) return;
        if (ok) {
          setPhase("show");
          return;
        }
        await delay(400 * (attempt + 1));
      }
      if (!cancelled) setPhase("empty");
    }

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [src]);

  return (
    <>
      <button
        type="button"
        className="thumb-open"
        ref={host}
        aria-label={`Enlarge ${name}`}
        title={`Enlarge ${name}`}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPreview(true);
        }}
      >
        {phase === "show" ? (
          <img className="thumb" alt="" width={40} height={40} src={src} />
        ) : (
          <span className={`thumb thumb-empty${phase === "wait" ? " thumb-wait" : ""}`} aria-hidden="true" />
        )}
      </button>
      {preview ? (
        <SkyPreview
          src={skySrc(raDeg, decDeg, majorArcmin, 640, 1.25)}
          name={name}
          typeLabel={typeLabel}
          magnitude={magnitude}
          onClose={() => setPreview(false)}
        />
      ) : null}
    </>
  );
}

function SkyPreview({
  src,
  name,
  typeLabel,
  magnitude,
  onClose,
}: {
  src: string;
  name: string;
  typeLabel: string;
  magnitude: number | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="preview-backdrop" onClick={onClose}>
      <div
        className="preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${name} preview`}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="preview-close" ref={closeRef} aria-label="Close preview" onClick={onClose}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
        <div className="preview-frame">
          {phase === "loading" ? <p className="preview-status">Loading the field…</p> : null}
          {phase === "error" ? <p className="preview-status">The preview did not load.</p> : null}
          {phase === "error" ? null : (
            <img
              src={src}
              alt=""
              onLoad={() => setPhase("ready")}
              onError={() => setPhase("error")}
              hidden={phase !== "ready"}
            />
          )}
        </div>
        <p className="preview-caption">
          <strong>{name}</strong>
          <span>{typeLabel}</span>
          <span>{magnitude == null ? "Magnitude not listed" : `mag ${magnitude.toFixed(1)}`}</span>
        </p>
      </div>
    </div>,
    document.body,
  );
}

function probeImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    const finish = (ok: boolean) => resolve(ok);
    image.onload = () => finish(image.naturalWidth > 0);
    image.onerror = () => finish(false);
    image.src = src;
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function ObjectDetails() {
  const { selected, track, site } = usePlannerState();
  const lists = useLists();
  const [infoOpen, setInfoOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const infoHost = useRef<HTMLDivElement>(null);
  const listHost = useRef<HTMLDivElement>(null);
  useMenuDismiss(infoOpen, infoHost, setInfoOpen);
  useMenuDismiss(listOpen, listHost, setListOpen);

  if (!selected) return null;

  const favorited = lists.favorites.includes(selected.id);

  return (
    <Section index="07" title="Object" hideHeading>
      <div className="object-heading">
        <div className="object-title-row">
          <h3 className="object-name">{objectTitle(selected)}</h3>
          <div className="info-menu" ref={infoHost}>
            <button
              type="button"
              className="icon-btn"
              aria-label="More object information"
              aria-expanded={infoOpen}
              onClick={() => setInfoOpen((open) => !open)}
            >
              i
            </button>
            {infoOpen ? (
              <div className="info-popover" role="dialog" aria-label={`More about ${objectTitle(selected)}`}>
                <p>
                  <span>Known as</span>
                  {knownAsText(selected)}
                </p>
                <p>
                  <span>Catalogues</span>
                  {selected.catalogues.map((catalogue) => catalogueLabel(catalogue)).join(", ")}
                </p>
                <p>
                  <span>RA J2000</span>
                  {formatRightAscension(selected.raDeg)}
                </p>
                <p>
                  <span>Dec J2000</span>
                  {formatDeclination(selected.decDeg)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="object-actions">
          <button
            type="button"
            className={`icon-btn${favorited ? " active" : ""}`}
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={favorited}
            onClick={() => lists.toggleFavorite(selected.id)}
          >
            {favorited ? "♥" : "♡"}
          </button>
          <div className="list-add-menu" ref={listHost}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Add to list"
              aria-expanded={listOpen}
              onClick={() => setListOpen((open) => !open)}
            >
              +
            </button>
            {listOpen ? (
              <div className="list-popover" role="dialog" aria-label={`Add ${objectTitle(selected)} to a list`}>
                <p className="list-popover-title">Add to list</p>
                {lists.lists.length === 0 ? <p className="list-popover-empty">No lists yet. Create one below.</p> : null}
                {lists.lists.map((list) => {
                  const already = list.items.some((item) => item.objectId === selected.id);
                  return (
                    <button
                      key={list.id}
                      type="button"
                      className={`list-option${already ? " added" : ""}`}
                      onClick={() => {
                        if (!already) lists.addToList(list.id, selected.id);
                        setListOpen(false);
                      }}
                    >
                      {already ? "✓ " : ""}
                      {list.name}
                    </button>
                  );
                })}
                <label className="field list-new-field">
                  <span className="visually-hidden">New list name</span>
                  <input
                    value={newListName}
                    placeholder="New list name"
                    onChange={(event) => setNewListName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      const listId = lists.createList(newListName);
                      if (!listId) return;
                      lists.addToList(listId, selected.id);
                      setNewListName("");
                      setListOpen(false);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    const listId = lists.createList(newListName);
                    if (!listId) return;
                    lists.addToList(listId, selected.id);
                    setNewListName("");
                    setListOpen(false);
                  }}
                >
                  Create list and add
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <dl className="facts facts-identity">
        <div>
          <dt>Code</dt>
          <dd>{primaryDesignation(selected)}</dd>
        </div>
        <div>
          <dt>Constellation</dt>
          <dd>{selected.constellation ? constellationName(selected.constellation) : "—"}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{objectTypeLabel(selected.type)}</dd>
        </div>
        <div>
          <dt>Magnitude</dt>
          <dd>{selected.magnitude == null ? "Not listed" : selected.magnitude.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{sizeText(selected.majorArcmin, selected.minorArcmin, selected.positionAngleDeg)}</dd>
        </div>
        <div>
          <dt>Imageable</dt>
          <dd>{track ? formatImageableHours(track.usableHours) : "—"}</dd>
        </div>
        <div>
          <dt>Rise / set</dt>
          <dd>{riseSetText(track, site.timezone)}</dd>
        </div>
      </dl>
    </Section>
  );
}

/** @deprecated Prefer ObjectDetails in the expanded target layout. */
export function ObjectIdentity() {
  return <ObjectDetails />;
}

/** @deprecated Prefer ObjectDetails in the expanded target layout. */
export function ObjectObserving() {
  return null;
}

/** @deprecated Prefer ObjectDetails in the expanded target layout. */
export function ObjectCard() {
  return <ObjectDetails />;
}

function riseSetText(
  track: { usableIntervals: { start: Date; end: Date }[] } | null,
  timezone: string,
): string {
  if (!track) return "—";
  if (track.usableIntervals.length === 0) {
    return `No good imaging window tonight (altitude, darkness, or Moon)`;
  }
  return track.usableIntervals
    .map((interval) => `${formatClock(interval.start, timezone)}–${formatClock(interval.end, timezone)}`)
    .join(", ");
}

function knownAsText(object: DeepSkyObject): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  function add(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(trimmed);
  }
  for (const name of object.names) add(name);
  add(primaryDesignation(object));
  add(formatCatalogueId(object.id));
  for (const alias of object.aliases) add(formatCatalogueId(alias));
  return parts.length ? parts.join(" · ") : "—";
}

function sizeText(major: number | null, minor: number | null, angle: number | null): string {
  if (major == null) return "Not listed";
  const minorText = minor == null ? "" : ` × ${formatArcmin(minor)}`;
  const angleText = angle == null ? "" : `, ${formatSignedDegrees(angle, 0)}`;
  return `${formatArcmin(major)}${minorText}${angleText}`;
}
