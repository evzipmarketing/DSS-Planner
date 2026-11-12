"use client";

import { useState, type ReactNode } from "react";
import { addDaysIso } from "@dss/core";
import { AltitudeChart } from "./altitude-chart";
import { BortlePanel } from "./bortle-panel";
import { DatePanel } from "./date-panel";
import { FramingPreview } from "./framing-preview";
import { LocationPanel } from "./location-panel";
import { ObjectCard, Shortlist } from "./target-panels";
import { RigPanel } from "./rig-panel";
import { WeatherPanel } from "./weather-panel";
import { usePlannerState } from "./planner-context";
import type { ThemeName } from "@/lib/storage";

export function TonightPage() {
  const planner = usePlannerState();
  const [more, setMore] = useState(false);
  return (
    <div className={`minimal tonight${more ? " show-all" : ""}`}>
      <a className="skip" href="#targets">
        Skip to the targets
      </a>
      <header className="app-head">
        <div className="min-bar">
          <strong>DSS Planner</strong>
          <ThemeToggle />
        </div>
        <div className="settings-bar">
          <Control label={`Location: ${planner.site.name} · Bortle ${planner.bortle}`}>
            <LocationPanel />
            <BortlePanel />
          </Control>
          <Control label={`Date: ${formatDay(planner.date)}`}>
            <DatePanel />
            <div className="day-row">
              <button type="button" className="day" onClick={() => planner.setDate(addDaysIso(planner.date, -1))}>
                Previous day
              </button>
              <button type="button" className="day" onClick={() => planner.setDate(addDaysIso(planner.date, 1))}>
                Next day
              </button>
            </div>
          </Control>
          <Control label={`Telescope: ${trimGear(planner.telescope?.name) ?? "None"}`}>
            <RigPanel part="telescope" />
          </Control>
          <Control label={`Camera: ${cameraLabel(planner.camera?.name, planner.filterIds.length)}`}>
            <RigPanel part="camera" />
          </Control>
        </div>
      </header>
      <section className="hero">
        <h1>Tonight from {planner.site.name}</h1>
        <p>
          <WeatherPanel plain />
          <LookUpNote />
        </p>
      </section>
      <div id="targets">
        <Shortlist />
      </div>
      <div className="hero-actions">
        <button type="button" className="ghost" aria-pressed={more} onClick={() => setMore((value) => !value)}>
          More targets
        </button>
      </div>
      {planner.selected ? (
        <div className="detail-stack">
          <ObjectCard />
          <AltitudeChart />
          <FramingPreview />
        </div>
      ) : null}
    </div>
  );
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="pop">
      <button type="button" className="chip-btn" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((value) => !value)}>
        <span>{label}</span>
        <span className="chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? <div className="pop-panel">{children}</div> : null}
    </span>
  );
}

function ThemeToggle() {
  const planner = usePlannerState();
  const next = nextTheme(planner.theme);
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Theme is ${themeLabel(planner.theme)}. Switch to ${themeLabel(next)}.`}
      title={`${themeLabel(planner.theme)}. Switch to ${themeLabel(next)}`}
      onClick={() => planner.setTheme(next)}
    >
      <ThemeIcon theme={planner.theme} />
    </button>
  );
}

function ThemeIcon({ theme }: { theme: ThemeName }) {
  switch (theme) {
    case "light":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case "dark":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
        </svg>
      );
    case "night":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle className="dot" cx="12" cy="12" r="3.2" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    default: {
      const unexpected: never = theme;
      return unexpected;
    }
  }
}

function nextTheme(theme: ThemeName): ThemeName {
  switch (theme) {
    case "light":
      return "dark";
    case "dark":
      return "night";
    case "night":
      return "light";
    default: {
      const unexpected: never = theme;
      return unexpected;
    }
  }
}

function themeLabel(theme: ThemeName): string {
  switch (theme) {
    case "light":
      return "Light";
    case "dark":
      return "Dark";
    case "night":
      return "Night";
    default: {
      const unexpected: never = theme;
      return unexpected;
    }
  }
}

function LookUpNote() {
  return (
    <span className="tip">
      <button type="button" className="tip-button" aria-describedby="look-up-note">
        i
      </button>
      <span className="tip-note" id="look-up-note" role="tooltip">
        Forecasts can be inaccurate — step outside and look up before you decide.
      </span>
    </span>
  );
}

function formatDay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match?.[1] || !match[2] || !match[3]) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[Number(match[2]) - 1] ?? match[2];
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function trimGear(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return name.replace(/^Sky-Watcher\s+/, "").replace(/^ZWO\s+/, "").replace(/\s+Pro$/, "");
}

function cameraLabel(name: string | undefined, filters: number): string {
  const camera = trimGear(name) ?? "None";
  if (filters <= 1) return camera;
  return `${camera} · ${filters} filters`;
}
