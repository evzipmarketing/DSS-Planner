"use client";

import { bortleLabel, isValidTimeZone } from "@dss/core";
import { locations } from "@dss/data";
import { useState } from "react";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

export function SitePanel() {
  const { site, setSite, date, setDate, bortle, setBortle } = usePlannerState();
  const [zoneDraft, setZoneDraft] = useState(site.timezone);
  const [trackedZone, setTrackedZone] = useState(site.timezone);
  const [zoneError, setZoneError] = useState("");
  if (trackedZone !== site.timezone) {
    setTrackedZone(site.timezone);
    setZoneDraft(site.timezone);
  }
  const hemisphereLat = site.latitude >= 0 ? "N" : "S";
  const hemisphereLon = site.longitude >= 0 ? "E" : "W";

  return (
    <Section index="01" title="Site">
      <div className="fields">
        <label className="field">
          Place
          <select
            value={locations.some((item) => item.id === site.id) ? site.id : "custom"}
            onChange={(event) => {
              const id = event.target.value;
              if (id === "custom") {
                setSite({ ...site, id: "custom", name: "Custom site" });
                return;
              }
              const preset = locations.find((item) => item.id === id);
              if (preset) setSite(preset);
            }}
          >
            {locations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
            <option value="custom">Custom site</option>
          </select>
        </label>
        <p className="coords">
          {Math.abs(site.latitude).toFixed(3)}° {hemisphereLat}, {Math.abs(site.longitude).toFixed(3)}° {hemisphereLon}
          {" · "}
          {site.timezone}
        </p>
        {site.id === "custom" ? (
          <>
            <label className="field">
              Latitude
              <input
                type="number"
                step="0.0001"
                min={-90}
                max={90}
                value={site.latitude}
                onChange={(event) => {
                  const latitude = Number(event.target.value);
                  if (Number.isFinite(latitude)) setSite({ ...site, latitude });
                }}
              />
            </label>
            <label className="field">
              Longitude
              <input
                type="number"
                step="0.0001"
                min={-180}
                max={180}
                value={site.longitude}
                onChange={(event) => {
                  const longitude = Number(event.target.value);
                  if (Number.isFinite(longitude)) setSite({ ...site, longitude });
                }}
              />
            </label>
            <label className="field">
              Timezone
              <input
                value={zoneDraft}
                onChange={(event) => {
                  const timezone = event.target.value;
                  setZoneDraft(timezone);
                  if (isValidTimeZone(timezone)) {
                    setZoneError("");
                    setSite({ ...site, timezone });
                  } else {
                    setZoneError("That timezone is not recognised.");
                  }
                }}
              />
            </label>
            {zoneError ? <p className="warn">{zoneError}</p> : null}
          </>
        ) : null}
        <label className="field">
          Night of
          <input
            type="date"
            value={date}
            onChange={(event) => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) setDate(event.target.value);
            }}
          />
        </label>
        <label className="field">
          <span className="inline">
            <span>Bortle class</span>
            <span>
              {bortle} · {bortleLabel(bortle)}
            </span>
          </span>
          <input
            type="range"
            min={1}
            max={9}
            step={1}
            value={bortle}
            onChange={(event) => setBortle(Number(event.target.value))}
          />
        </label>
      </div>
      <p className="note">Tithi and nakshatra will come from the owner’s Panchang engine in a later phase.</p>
    </Section>
  );
}
