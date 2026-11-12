"use client";

import { useState, type ReactNode } from "react";
import {
  CATALOGUE_IDS,
  DEEP_SKY_TYPES,
  TARGET_LIST_FILTERS,
  bandLabel,
  catalogueLabel,
  formatArcmin,
  formatCatalogueId,
  formatDeclination,
  formatHours,
  formatRightAscension,
  formatSignedDegrees,
  listFilterLabel,
  objectTitle,
  primaryDesignation,
  objectTypeLabel,
  type CatalogueId,
  type DeepSkyType,
} from "@dss/core";
import { constellationName } from "@dss/data";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

export function Shortlist({ detail }: { detail?: ReactNode }) {
  const {
    shortlist,
    scoring,
    catalogue,
    selected,
    chooseTarget,
    targetQuery,
    setTargetQuery,
    extendedReady,
    listFilter,
    setListFilter,
    query,
    setQuery,
    results,
  } = usePlannerState();
  const [shown, setShown] = useState(20);
  const visible = shortlist.slice(0, shown);
  return (
    <Section index="06" title="Tonight's targets">
      <div className="target-tools">
        <div className="tabs" aria-label="Target filters">
          {TARGET_LIST_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className="tab"
              aria-pressed={listFilter === filter}
              onClick={() => {
                setListFilter(filter);
                setShown(20);
              }}
            >
              {listFilterLabel(filter)}
            </button>
          ))}
        </div>
        <label className="field">
          Name or catalogue id
          <input
            value={query}
            placeholder="M42, NGC 224, Horsehead"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {!catalogue ? <p className="note">Loading the deep-sky catalogue…</p> : null}
      <div className="rows">
        {results.map((object) => (
          <button key={object.id} type="button" className="row" onClick={() => chooseTarget(object.id)}>
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
      {catalogue && query.trim() && results.length === 0 ? (
        <p className="note">
          {extendedReady ? "No match in the loaded catalogues." : "No match in the core list yet. The extended catalogues are still loading."}
        </p>
      ) : null}
      <details className="drawer">
        <summary>Type, catalogue, magnitude, size</summary>
        <div className="fields">
          <label className="field">
            Object types
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
            Catalogues
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
            Fainter than this magnitude is hidden
            <input
              inputMode="decimal"
              placeholder="Any"
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
            Minimum size (arcmin)
            <input
              inputMode="decimal"
              placeholder="Any"
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
        <p className="note">
          Leave the lists empty for the usual shortlist. Hold Ctrl or Command to pick more than one type or catalogue.
          {!extendedReady ? " The extended catalogues are still loading." : ""}
        </p>
      </details>
      {!catalogue || scoring ? <p className="note">Scoring objects for this site, date, and rig…</p> : null}
      {catalogue && !scoring && shortlist.length === 0 ? (
        <p className="note">Nothing in this view clears the horizon. Try another night, site, or filter.</p>
      ) : null}
      <div className="rows">
        {visible.map((item) => (
          <div key={item.object.id} className="target-slot">
          <button
            type="button"
            className="target"
            aria-pressed={selected?.id === item.object.id}
            onClick={() => chooseTarget(item.object.id)}
          >
            <span className="target-top">
              <TargetThumb raDeg={item.object.raDeg} decDeg={item.object.decDeg} majorArcmin={item.object.majorArcmin} />
              <strong>{objectTitle(item.object)}</strong>
              {objectTitle(item.object) === primaryDesignation(item.object) ? null : (
                <span>{primaryDesignation(item.object)}</span>
              )}
              <span>{objectTypeLabel(item.object.type)}</span>
              <span className="tag">{bandLabel(item.band)}</span>
            </span>
            <span className="target-facts">
              <span>{item.frameFillPercent == null ? "—" : `${Math.round(item.frameFillPercent)}%`}</span>
              <span>{`${item.usableHours.toFixed(1)} h`}</span>
            </span>
          </button>
          {detail && selected?.id === item.object.id ? <div className="inline-detail">{detail}</div> : null}
          </div>
        ))}
      </div>
      {shortlist.length > shown ? (
        <button type="button" className="ghost show-more" onClick={() => setShown((count) => count + 20)}>
          Show more
        </button>
      ) : null}
    </Section>
  );
}

function TargetThumb({ raDeg, decDeg, majorArcmin }: { raDeg: number; decDeg: number; majorArcmin: number | null }) {
  const [failed, setFailed] = useState(false);
  const fov = Math.min(6, Math.max(0.15, ((majorArcmin ?? 15) / 60) * 1.8));
  const src = `/api/sky?ra=${raDeg.toFixed(4)}&dec=${decDeg.toFixed(4)}&fov=${fov.toFixed(3)}&size=96`;
  if (failed) return <span className="thumb thumb-empty" aria-hidden="true" />;
  return <img className="thumb" alt="" width={40} height={40} loading="lazy" src={src} onError={() => setFailed(true)} />;
}

export function ObjectCard() {
  const { selected, track } = usePlannerState();
  return (
    <Section index="07" title="Object">
      {!selected ? (
        <p className="note">Search a catalogue id or a common name, or take one from the shortlist.</p>
      ) : (
        <>
          <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-display)", fontWeight: 520 }}>
            {objectTitle(selected)} <span className="tag">{primaryDesignation(selected)}</span>
          </h3>
          <dl className="facts">
            <div>
              <dt>Catalogue</dt>
              <dd>{primaryDesignation(selected)}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{objectTypeLabel(selected.type)}</dd>
            </div>
            <div>
              <dt>RA J2000</dt>
              <dd>{formatRightAscension(selected.raDeg)}</dd>
            </div>
            <div>
              <dt>Dec J2000</dt>
              <dd>{formatDeclination(selected.decDeg)}</dd>
            </div>
            <div>
              <dt>Constellation</dt>
              <dd>{constellationName(selected.constellation)}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{sizeText(selected.majorArcmin, selected.minorArcmin, selected.positionAngleDeg)}</dd>
            </div>
            <div>
              <dt>Magnitude</dt>
              <dd>{selected.magnitude == null ? "Not listed" : selected.magnitude.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Also known as</dt>
              <dd>{selected.aliases.map((alias) => formatCatalogueId(alias)).join(" · ")}</dd>
            </div>
            <div>
              <dt>Catalogues</dt>
              <dd>{selected.catalogues.map((catalogue) => catalogueLabel(catalogue)).join(", ")}</dd>
            </div>
            {selected.opacity != null ? (
              <div>
                <dt>Opacity</dt>
                <dd>Class {selected.opacity}</dd>
              </div>
            ) : null}
            {track ? (
              <div>
                <dt>Usable tonight</dt>
                <dd>{track.usableHours > 0 ? formatHours(track.usableHours) : "None"}</dd>
              </div>
            ) : null}
          </dl>
          {selected.names.length > 1 ? <p className="note">Also called {selected.names.slice(1).join(", ")}.</p> : null}
          {selected.note ? <p className="note">{selected.note}</p> : null}
        </>
      )}
    </Section>
  );
}

function sizeText(major: number | null, minor: number | null, angle: number | null): string {
  if (major == null) return "Not listed";
  const minorText = minor == null ? "" : ` × ${formatArcmin(minor)}`;
  const angleText = angle == null ? "" : `, ${formatSignedDegrees(angle, 0)}`;
  return `${formatArcmin(major)}${minorText}${angleText}`;
}
