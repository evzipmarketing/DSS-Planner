"use client";

import { useEffect, useState } from "react";
import {
  addDaysIso,
  hoursBetween,
  skyCoverLabel,
  summarizeForecast,
  type ForecastHour,
  type ForecastSummary,
} from "@dss/core";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

type Remote =
  | { key: string; hours: ForecastHour[] }
  | { key: string; error: string };

const memory = new Map<string, { at: number; hours: ForecastHour[] }>();

export function WeatherPanel() {
  const { site, date } = usePlannerState();
  const [remote, setRemote] = useState<Remote | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const cacheKey = `${site.latitude.toFixed(2)}|${site.longitude.toFixed(2)}|${site.timezone}`;
  const cachedHours = memory.get(cacheKey)?.hours ?? null;

  useEffect(() => {
    const entry = memory.get(cacheKey);
    if (entry && Date.now() - entry.at < 10 * 60 * 1000) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      lat: String(site.latitude),
      lon: String(site.longitude),
      tz: site.timezone,
    });
    void fetch(`/api/weather?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("The forecast did not load.");
        const body = (await response.json()) as { hours?: ForecastHour[] };
        const hours = body.hours ?? [];
        memory.set(cacheKey, { at: Date.now(), hours });
        setRemote({ key: cacheKey, hours });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRemote({ key: cacheKey, error: "Cloud cover is unavailable right now." });
      });
    return () => controller.abort();
  }, [cacheKey, site.latitude, site.longitude, site.timezone]);

  const hours =
    (remote && remote.key === cacheKey && "hours" in remote ? remote.hours : null) ?? cachedHours;
  const error = remote && remote.key === cacheKey && "error" in remote ? remote.error : null;
  const summary = hours ? nightSummary(hours, date) : null;
  const chosen = summary?.hours.find((hour) => hour.time === picked);
  const active = chosen ?? summary?.best ?? null;

  return (
    <Section index="04" title="Sky cover">
      {!summary && !error ? <p className="note">Fetching the night’s cloud cover…</p> : null}
      {error ? <p className="warn">{error}</p> : null}
      {summary && summary.hours.length === 0 ? (
        <p className="note">Open-Meteo has no hours for this night. Forecasts cover the coming week.</p>
      ) : null}
      {summary && summary.hours.length > 0 && summary.best ? (
        <>
          <div className="hour-row">
            {summary.hours.map((hour) => {
              const cover = hour.cloud < 25 ? "clear" : hour.cloud < 50 ? "broken" : hour.cloud < 80 ? "cloudy" : "overcast";
              const selected = active?.time === hour.time;
              return (
                <button
                  key={hour.time}
                  type="button"
                  className={`hour ${cover} ${selected ? "selected" : ""}`}
                  onClick={() => setPicked(hour.time)}
                >
                  <span>{hour.time.slice(11, 16)}</span>
                  <small>{Math.round(hour.cloud)}%</small>
                </button>
              );
            })}
          </div>
          <p className="summary">
            {skyCoverLabel(summary.cover)} · mean cloud {Math.round(summary.meanCloud)}% from 17:00 to 06:00.
            {active ? (
              <>
                {" "}
                At {active.time.slice(11, 16)}: low {Math.round(active.cloudLow)}%, mid {Math.round(active.cloudMid)}%, high{" "}
                {Math.round(active.cloudHigh)}%, rain chance {Math.round(active.precipitation)}%, wind{" "}
                {Math.round(active.windKmh)} km/h, {Math.round(active.temperatureC)}°C.
              </>
            ) : null}
          </p>
        </>
      ) : null}
      <p className="note">Hourly cloud, wind, and temperature from Open-Meteo. Responses are cached for ten minutes.</p>
      <p className="note">Forecasts can be inaccurate — step outside and look up before you decide.</p>
    </Section>
  );
}

function nightSummary(hours: ForecastHour[], date: string) {
  const endDate = addDaysIso(date, 1);
  return summarizeForecast(hoursBetween(hours, `${date}T17:00`, `${endDate}T06:00`));
}
