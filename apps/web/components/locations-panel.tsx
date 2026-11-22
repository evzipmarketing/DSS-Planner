"use client";

import { useEffect, useMemo, useState } from "react";
import { isValidTimeZone, type Site } from "@dss/core";
import { locations as presetLocations } from "@dss/data";
import { usePlannerState } from "./planner-context";

export function LocationsPanel() {
  const planner = usePlannerState();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="locations-panel">
      <p className="note">
        Save several observing sites. Tap one to make it active for Tonight altitude, moon, and weather.
      </p>

      <div className="equipment-section-head">
        <h2>Saved locations</h2>
        <button type="button" className="ghost" onClick={() => setAddOpen(true)}>
          + Add location
        </button>
      </div>

      <div className="hub-card equipment-list">
        {planner.savedSites.length === 0 ? (
          <p className="note" style={{ margin: 0, padding: "14px 16px" }}>
            No saved locations yet. Add a search result, preset, or coordinates.
          </p>
        ) : (
          planner.savedSites.map((site) => {
            const active = planner.activeSiteId === site.id || planner.site.id === site.id;
            return (
              <div key={site.id} className={`equipment-row${active ? " is-active" : ""}`}>
                <button type="button" className="equipment-row-main" onClick={() => planner.selectSavedSite(site.id)}>
                  <strong>
                    {site.name}
                    {active ? <span className="hub-badge">Active</span> : null}
                  </strong>
                  <span>
                    {site.latitude.toFixed(3)}°, {site.longitude.toFixed(3)}° · {site.timezone}
                  </span>
                </button>
                <button
                  type="button"
                  className="ghost equipment-delete"
                  onClick={() => {
                    if (window.confirm(`Remove “${site.name}”?`)) planner.deleteSavedSite(site.id);
                  }}
                >
                  Delete
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className={`hub-card equipment-active${planner.locationReady ? " is-active" : ""}`}>
        <p className="setting-prefix">Tonight active location</p>
        <strong>{planner.site.name}</strong>
        <p className="note" style={{ margin: 0 }}>
          {planner.site.latitude.toFixed(3)}°, {planner.site.longitude.toFixed(3)}° · {planner.site.timezone}
        </p>
      </div>

      {addOpen ? <AddLocationDialog onClose={() => setAddOpen(false)} /> : null}
    </div>
  );
}

function AddLocationDialog({ onClose }: { onClose: () => void }) {
  const planner = usePlannerState();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Site[]>([]);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("search");
          return (await response.json()) as { results?: Site[] };
        })
        .then((body) => setResults(body.results ?? []))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResults([]);
        });
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const presets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? presetLocations.filter((item) => item.name.toLowerCase().includes(q)) : presetLocations;
    return pool.slice(0, 12);
  }, [query]);

  function useSite(site: Site, activate: boolean) {
    if (activate) planner.chooseSite(site);
    else planner.saveSite(site);
    onClose();
  }

  async function saveManual(activate: boolean) {
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setError("Latitude must be between −90 and 90.");
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError("Longitude must be between −180 and 180.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/place?lat=${latitude}&lon=${longitude}`);
      if (!response.ok) throw new Error("place");
      const place = (await response.json()) as { name?: string; timezone?: string };
      const timezone = place.timezone && isValidTimeZone(place.timezone) ? place.timezone : "UTC";
      const site: Site = {
        id: "custom",
        name: name.trim() || place.name || "Custom coordinates",
        latitude,
        longitude,
        timezone,
      };
      useSite(site, activate);
    } catch {
      useSite(
        {
          id: "custom",
          name: name.trim() || "Custom coordinates",
          latitude,
          longitude,
          timezone: "UTC",
        },
        activate,
      );
    }
  }

  return (
    <div className="equipment-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="equipment-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Add location"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="equipment-dialog-head">
          <h2>Add location</h2>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="equipment-dialog-body">
          <label className="field">
            Search place or preset
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dark sky park, city…" />
          </label>
          {results.length > 0 ? (
            <div className="location-results">
              <p className="setting-prefix">Search results</p>
              {results.map((site) => (
                <button key={`${site.name}-${site.latitude}`} type="button" className="ghost rig-option" onClick={() => useSite(site, true)}>
                  <strong>{site.name}</strong>
                  <span>
                    {site.latitude.toFixed(3)}°, {site.longitude.toFixed(3)}° · {site.timezone}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {presets.length > 0 ? (
            <div className="location-results">
              <p className="setting-prefix">Presets</p>
              {presets.map((site) => (
                <button key={site.id} type="button" className="ghost rig-option" onClick={() => useSite(site, true)}>
                  <strong>{site.name}</strong>
                  <span>
                    {site.latitude.toFixed(3)}°, {site.longitude.toFixed(3)}° · {site.timezone}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <p className="note">Or enter coordinates</p>
          <label className="field">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="My backyard" />
          </label>
          <label className="field">
            Latitude
            <input value={lat} onChange={(event) => setLat(event.target.value)} inputMode="decimal" />
          </label>
          <label className="field">
            Longitude
            <input value={lon} onChange={(event) => setLon(event.target.value)} inputMode="decimal" />
          </label>
          {error ? <p className="warn">{error}</p> : null}
        </div>
        <footer className="equipment-dialog-foot">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ghost" onClick={() => void saveManual(false)}>
            Save only
          </button>
          <button type="button" className="primary" onClick={() => void saveManual(true)}>
            Save & use
          </button>
        </footer>
      </div>
    </div>
  );
}
