"use client";

import { useState, type ReactNode } from "react";
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

type SettingsPanel = "location" | "date" | "telescope" | "camera";

export function TonightPage() {
  const planner = usePlannerState();
  const [panel, setPanel] = useState<SettingsPanel | null>(null);
  const place = planner.site.name;
  const day = formatDay(planner.date);
  const scope = trimGear(planner.telescope?.name) ?? "None";
  const camera = cameraLabel(planner.camera?.name, planner.filterIds.length);
  function toggle(next: SettingsPanel) {
    setPanel((current) => (current === next ? null : next));
  }
  return (
    <div className="minimal tonight">
      <a className="skip" href="#targets">
        Skip to the targets
      </a>
      <header className="app-head">
        <div className="min-bar">
          <div className="brand">
            <img
              className="brand-lockup brand-lockup-light"
              src="/deepskymate-logo-light.png"
              alt="DeepSkyMate"
              width={300}
              height={71}
            />
            <img
              className="brand-lockup brand-lockup-dark"
              src="/deepskymate-logo-dark.png"
              alt="DeepSkyMate"
              width={300}
              height={71}
            />
          </div>
          <ThemeToggle />
        </div>
        <div className={`settings-bar${panel ? " settings-open" : ""}`}>
          <div className="settings-row">
            <Control
              icon={<PinIcon />}
              prefix="Location"
              value={place}
              label={`Location, ${place}, ${planner.bortleLoading ? "Bortle updating" : `Bortle ${planner.bortle}`}`}
              open={panel === "location"}
              onToggle={() => toggle("location")}
            />
            <Control
              icon={<CalendarIcon />}
              prefix="Date"
              value={day}
              label={`Date, ${day}`}
              open={panel === "date"}
              onToggle={() => toggle("date")}
            />
            <Control
              icon={<TelescopeIcon />}
              prefix="Telescope"
              value={scope}
              label={`Telescope, ${scope}`}
              open={panel === "telescope"}
              onToggle={() => toggle("telescope")}
            />
            <Control
              icon={<CameraIcon />}
              prefix="Camera"
              value={camera}
              label={`Camera, ${camera}`}
              open={panel === "camera"}
              onToggle={() => toggle("camera")}
            />
          </div>
          {panel ? (
            <div className="settings-panel" id="settings-panel" role="region" aria-label={panelLabel(panel)}>
              <PanelBody panel={panel} />
            </div>
          ) : null}
        </div>
      </header>
      <section className="hero">
        <h1>Tonight from {planner.site.name}</h1>
        <div className="sky-meta">
          <WeatherPanel plain />
          <span className="bortle-line" title="Sky brightness class estimated for this site.">
            {planner.bortleLoading ? "Bortle…" : `Bortle ${planner.bortle}`}
          </span>
          <LookUpNote />
        </div>
      </section>
      <div id="targets">
        <Shortlist
          detail={
            <>
              <ObjectCard />
              <div className="detail-viz">
                <AltitudeChart />
                <FramingPreview />
              </div>
            </>
          }
        />
      </div>
    </div>
  );
}

function Control({
  icon,
  prefix,
  value,
  label,
  open,
  onToggle,
}: {
  icon: ReactNode;
  prefix: string;
  value: string;
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <span className="pop">
      <button
        type="button"
        className="chip-btn"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={open ? "settings-panel" : undefined}
        onClick={onToggle}
      >
        <span className="setting-icon">{icon}</span>
        <span className="setting-text">
          <span className="setting-prefix">{prefix}</span>
          <span className="setting-value">{value}</span>
        </span>
        <span className="chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
    </span>
  );
}

function PanelBody({ panel }: { panel: SettingsPanel }) {
  switch (panel) {
    case "location":
      return (
        <>
          <LocationPanel />
          <BortlePanel />
        </>
      );
    case "date":
      return <DatePanel />;
    case "telescope":
      return <RigPanel part="telescope" />;
    case "camera":
      return <RigPanel part="camera" />;
    default: {
      const unexpected: never = panel;
      return unexpected;
    }
  }
}

function panelLabel(panel: SettingsPanel): string {
  switch (panel) {
    case "location":
      return "Location";
    case "date":
      return "Date";
    case "telescope":
      return "Telescope";
    case "camera":
      return "Camera";
    default: {
      const unexpected: never = panel;
      return unexpected;
    }
  }
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" />
    </svg>
  );
}

function TelescopeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 15.5l8.2-4.2 1.6 3.1L4.6 18.6z" />
      <circle cx="15.2" cy="9" r="3.1" />
      <path d="M17.6 11.4L21 15" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8h3.2L8.8 6h6.4l1.6 2H20v11H4z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
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
  return name.replace(/^(Sky-Watcher|ZWO)\s+/, "");
}

function cameraLabel(name: string | undefined, filters: number): string {
  const camera = trimGear(name) ?? "None";
  if (filters <= 1) return camera;
  return `${camera} · ${filters} filters`;
}
