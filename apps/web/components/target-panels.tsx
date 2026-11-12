"use client";

import {
  formatArcmin,
  formatCatalogueId,
  formatDeclination,
  formatHours,
  formatRightAscension,
  formatSignedDegrees,
  objectTitle,
  objectTypeLabel,
} from "@dss/core";
import { constellationName } from "@dss/data";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

export function Shortlist() {
  const { shortlist, scoring, catalogue, selected, chooseTarget } = usePlannerState();
  return (
    <Section index="03" title="Best targets tonight">
      {!catalogue || scoring ? <p className="note">Scoring objects that clear 30° in astronomical darkness…</p> : null}
      {catalogue && !scoring && shortlist.length === 0 ? (
        <p className="note">Nothing in the shortlist stays up. Try another night or a different site.</p>
      ) : null}
      <div className="rows">
        {shortlist.map((item, index) => (
          <button
            key={item.object.id}
            type="button"
            className="row"
            aria-pressed={selected?.id === item.object.id}
            onClick={() => chooseTarget(item.object.id)}
          >
            <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
            <span>
              <strong>{objectTitle(item.object)}</strong>
              <small>
                {formatCatalogueId(item.object.id)} · {objectTypeLabel(item.object.type)}
              </small>
            </span>
            <span className="meta">
              {Math.round(item.maxAltitudeDeg)}°
              <br />
              {formatHours(item.usableHours)}
            </span>
          </button>
        ))}
      </div>
    </Section>
  );
}

export function CatalogueSearch() {
  const { query, setQuery, results, chooseTarget, catalogue } = usePlannerState();
  return (
    <Section index="04" title="Catalogue">
      <label className="field">
        Name or catalogue id
        <input
          value={query}
          placeholder="M42, NGC 224, Horsehead"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {!catalogue ? <p className="note">Loading the deep-sky catalogue…</p> : null}
      <div className="rows" style={{ marginTop: 10 }}>
        {results.map((object) => (
          <button key={object.id} type="button" className="row" onClick={() => chooseTarget(object.id)}>
            <span className="row-index">{formatCatalogueId(object.id)}</span>
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
      {catalogue && query.trim() && results.length === 0 ? <p className="note">No match in the loaded catalogues.</p> : null}
    </Section>
  );
}

export function ObjectCard() {
  const { selected, track } = usePlannerState();
  return (
    <Section index="05" title="Object">
      {!selected ? (
        <p className="note">Search a catalogue id or a common name, or take one from the shortlist.</p>
      ) : (
        <>
          <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-display)", fontWeight: 520 }}>
            {objectTitle(selected)}
          </h3>
          <dl className="facts">
            <div>
              <dt>Catalogue</dt>
              <dd>{formatCatalogueId(selected.id)}</dd>
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
              <dt>Source</dt>
              <dd>{selected.source === "lynds" ? "Lynds 1962" : "OpenNGC"}</dd>
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
