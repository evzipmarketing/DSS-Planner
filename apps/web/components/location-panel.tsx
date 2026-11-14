"use client";

import { useEffect, useState } from "react";
import { isValidTimeZone, type Site } from "@dss/core";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

export function LocationPanel() {
  const { site, chooseSite, placeStatus } = usePlannerState();
  const [text, setText] = useState("");
  const [results, setResults] = useState<Site[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    const query = text.trim();
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("search");
          return (await response.json()) as { results?: Site[] };
        })
        .then((body) => {
          setResults(body.results ?? []);
          setSearchError(null);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setSearchError("Place search is unavailable right now.");
        });
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [text]);

  async function applyManual() {
    const latitude = Number(manualLat);
    const longitude = Number(manualLon);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setManualError("Latitude must be between −90 and 90.");
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setManualError("Longitude must be between −180 and 180.");
      return;
    }
    setManualError(null);
    try {
      const response = await fetch(`/api/place?lat=${latitude}&lon=${longitude}`);
      if (!response.ok) throw new Error("place");
      const place = (await response.json()) as { name?: string; timezone?: string };
      const timezone = place.timezone && isValidTimeZone(place.timezone) ? place.timezone : "UTC";
      chooseSite({
        id: "custom",
        name: place.name || "Custom coordinates",
        latitude,
        longitude,
        timezone,
      });
    } catch {
      chooseSite({
        id: "custom",
        name: "Custom coordinates",
        latitude,
        longitude,
        timezone: "UTC",
      });
      setManualError("The place name could not be resolved. Coordinates are saved in UTC.");
    }
  }

  const status =
    placeStatus === "detecting"
      ? "Looking up this browser’s location…"
      : placeStatus === "gps"
        ? "Using this browser’s location."
        : placeStatus === "saved"
          ? "Using the place you chose."
          : "Location access was denied or unavailable. Search for a place or enter coordinates.";

  const showSite = placeStatus === "gps" || placeStatus === "saved";

  return (
    <Section index="01" title="Location">
      <p className="note">{status}</p>
      {showSite ? (
        <>
          <p className="coords">
            <strong>{site.name}</strong>
          </p>
          <p className="coords">
            {formatCoord(site.latitude, "N", "S")}, {formatCoord(site.longitude, "E", "W")}
          </p>
          <p className="note">{site.timezone}</p>
        </>
      ) : null}
      <label className="field">
        Search for a place
        <input
          value={text}
          placeholder="e.g. Pune, Hanle, Atacama"
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      {searchError ? <p className="note">{searchError}</p> : null}
      <div className="rows" style={{ marginTop: 8 }}>
        {results.map((result) => (
          <button
            key={`${result.latitude}-${result.longitude}-${result.name}`}
            type="button"
            className="row"
            onClick={() => {
              chooseSite(result);
              setText("");
              setResults([]);
            }}
          >
            <span>
              <strong>{result.name}</strong>
              <small>
                {result.latitude.toFixed(3)}°, {result.longitude.toFixed(3)}° · {result.timezone}
              </small>
            </span>
          </button>
        ))}
      </div>
      <details className="drawer">
        <summary>Enter latitude and longitude</summary>
        <div className="fields">
          <label className="field">
            Latitude
            <input inputMode="decimal" placeholder="e.g. 17.385" value={manualLat} onChange={(event) => setManualLat(event.target.value)} />
          </label>
          <label className="field">
            Longitude
            <input inputMode="decimal" placeholder="e.g. 78.487" value={manualLon} onChange={(event) => setManualLon(event.target.value)} />
          </label>
          <button type="button" className="ghost" onClick={() => void applyManual()}>
            Use these coordinates
          </button>
          {manualError ? <p className="note">{manualError}</p> : null}
        </div>
      </details>
    </Section>
  );
}

function formatCoord(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(3)}° ${hemisphere}`;
}
