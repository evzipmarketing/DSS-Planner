"use client";

import { useEffect, useState, type ReactNode } from "react";
import { shortPlaceName } from "@dss/core";
import { AltitudeChart } from "./altitude-chart";
import { BortlePanel } from "./bortle-panel";
import { DatePanel } from "./date-panel";
import { FramingPreview } from "./framing-preview";
import { LocationPanel } from "./location-panel";
import { ObjectDetails, Shortlist } from "./target-panels";
import { RigPanel } from "./rig-panel";
import { WeatherPanel } from "./weather-panel";
import { usePlannerState } from "./planner-context";
import type { ThemeName } from "@/lib/storage";

type SettingsPanel = "location" | "date" | "telescope" | "camera" | "catalogue";

export function TonightPage() {
  const planner = usePlannerState();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<SettingsPanel | null>(null);
  const place = planner.locationReady ? planner.site.name : planner.placeStatus === "detecting" ? "Detecting…" : "Set location";
  const day = formatDay(planner.date);
  const scope = trimGear(planner.telescope?.name) ?? "Choose…";
  const camera = cameraLabel(planner.camera?.name, planner.filterIds.length, true);
  const catalogueSummary = [
    planner.includeExtendedCatalogue ? "Extended" : "Core",
    planner.includeComponentObjects ? "components" : "hosts",
  ].join(" · ");

  function toggleSettings() {
    setOpen((current) => {
      const next = !current;
      if (!next) setPanel(null);
      return next;
    });
  }

  function choose(next: SettingsPanel) {
    setPanel((current) => (current === next ? null : next));
  }

  useEffect(() => {
    if (planner.placeStatus === "needed") {
      setOpen(true);
      setPanel("location");
    }
  }, [planner.placeStatus]);

  return (
    <div className="minimal tonight">
      <a className="skip" href="#targets">
        Skip to the targets
      </a>
      <header className="app-head">
        <div className="min-bar">
          <div className="brand">
            <img
              className="brand-lockup brand-lockup-dark"
              src="/deepskymate-logo-dark.svg"
              alt="DeepSkyMate"
              width={300}
              height={71}
            />
          </div>
          <ThemeToggle />
        </div>
      </header>
      <section className="hero hero-with-settings">
        <div className="hero-copy">
          <p className="hero-kicker">DeepSkyMate / Observatory</p>
          <p className="hero-place">
            {planner.locationReady
              ? `${shortPlaceName(planner.site.name)} · ${formatDayLong(planner.date)}`
              : planner.placeStatus === "detecting"
                ? "Detecting location…"
                : "Set location and date in settings"}
          </p>
          {planner.locationReady ? (
            <div className="sky-meta">
              <WeatherPanel plain />
              <span className="bortle-line" title="Sky brightness class estimated for this site.">
                {planner.bortleLoading ? "Bortle…" : `Bortle ${planner.bortle}`}
              </span>
              <LookUpNote />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={`settings-toggle${open ? " is-open" : ""}`}
          aria-label="Observatory settings"
          aria-expanded={open}
          aria-controls={open ? "settings-panel" : undefined}
          title="Location, date, telescope, and camera"
          onClick={toggleSettings}
        >
          <SlidersIcon />
        </button>
      </section>
      {open ? (
        <div className={`settings-bar settings-open`}>
          <div className="settings-row">
            <Control
              icon={<PinIcon />}
              prefix="Location"
              value={place}
              label={`Location, ${place}${planner.locationReady ? `, ${planner.bortleLoading ? "Bortle updating" : `Bortle ${planner.bortle}`}` : ""}`}
              open={panel === "location"}
              onToggle={() => choose("location")}
            />
            <Control
              icon={<CalendarIcon />}
              prefix="Date"
              value={day}
              label={`Date, ${day}`}
              open={panel === "date"}
              onToggle={() => choose("date")}
            />
            <Control
              icon={<TelescopeIcon />}
              prefix="Telescope"
              value={scope}
              label={`Telescope, ${scope}`}
              open={panel === "telescope"}
              onToggle={() => choose("telescope")}
            />
            <Control
              icon={<CameraIcon />}
              prefix="Camera"
              value={camera}
              label={`Camera, ${camera}`}
              open={panel === "camera"}
              onToggle={() => choose("camera")}
            />
            <Control
              icon={<CatalogueIcon />}
              prefix="Catalogue"
              value={catalogueSummary}
              label={`Catalogue, ${catalogueSummary}`}
              open={panel === "catalogue"}
              onToggle={() => choose("catalogue")}
            />
          </div>
          {panel ? (
            <div className="settings-panel" id="settings-panel" role="region" aria-label={panelLabel(panel)}>
              <PanelBody panel={panel} onDone={() => setPanel(null)} />
            </div>
          ) : null}
        </div>
      ) : null}
      <div id="targets">
        {planner.setupReady ? (
          <Shortlist
            detail={
              <div className="detail-viz">
                <div className="detail-col">
                  <ObjectDetails />
                  <AltitudeChart compact />
                </div>
                <FramingPreview />
              </div>
            }
          />
        ) : null}
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

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h9" />
      <path d="M17 7h3" />
      <circle cx="15" cy="7" r="2" />
      <path d="M4 12h3" />
      <path d="M11 12h9" />
      <circle cx="9" cy="12" r="2" />
      <path d="M4 17h11" />
      <path d="M19 17h1" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function PanelBody({ panel, onDone }: { panel: SettingsPanel; onDone: () => void }) {
  switch (panel) {
    case "location":
      return (
        <>
          <LocationPanel onDone={onDone} />
          <BortlePanel />
        </>
      );
    case "date":
      return <DatePanel onDone={onDone} />;
    case "telescope":
      return <RigPanel part="telescope" onDone={onDone} />;
    case "camera":
      return <RigPanel part="camera" onDone={onDone} />;
    case "catalogue":
      return <CataloguePrefsPanel onDone={onDone} />;
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
    case "catalogue":
      return "Catalogue";
    default: {
      const unexpected: never = panel;
      return unexpected;
    }
  }
}

function CataloguePrefsPanel({ onDone }: { onDone: () => void }) {
  const planner = usePlannerState();
  return (
    <div className="block" style={{ display: "grid", gap: 12 }}>
      <p className="note" style={{ display: "block", margin: 0 }}>
        Tonight defaults to the popular core list and hides letter-suffix components of larger objects. Ranking prefers Messier, then NGC, IC, Sharpless when nights are otherwise similar.
      </p>
      <label className="field" style={{ display: "flex", alignItems: "center", gap: 10, width: "auto" }}>
        <input
          type="checkbox"
          checked={planner.includeExtendedCatalogue}
          onChange={(event) => planner.setIncludeExtendedCatalogue(event.target.checked)}
        />
        <span>
          Include extended catalogue
          <small style={{ display: "block", color: "var(--muted)" }}>Adds ~19k fainter objects</small>
        </span>
      </label>
      <label className="field" style={{ display: "flex", alignItems: "center", gap: 10, width: "auto" }}>
        <input
          type="checkbox"
          checked={planner.includeComponentObjects}
          onChange={(event) => planner.setIncludeComponentObjects(event.target.checked)}
        />
        <span>
          Include component objects
          <small style={{ display: "block", color: "var(--muted)" }}>Shows pieces such as NGC4676A</small>
        </span>
      </label>
      <button type="button" className="ghost" onClick={onDone}>
        Done
      </button>
    </div>
  );
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

function CatalogueIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2V4z" />
      <path d="M7 4v16" />
      <path d="M10 8h6M10 12h6M10 16h4" />
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
    case "dark":
      return "night";
    case "night":
      return "dark";
    default: {
      const unexpected: never = theme;
      return unexpected;
    }
  }
}

function themeLabel(theme: ThemeName): string {
  switch (theme) {
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

function formatDayLong(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match?.[1] || !match[2] || !match[3]) return iso;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = months[Number(match[2]) - 1] ?? match[2];
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function trimGear(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return name.replace(/^(Sky-Watcher|ZWO)\s+/, "");
}

function cameraLabel(name: string | undefined, filters: number, emptyHint = false): string {
  const camera = trimGear(name) ?? (emptyHint ? "Choose…" : "None");
  if (!name) return camera;
  if (filters <= 1) return camera;
  return `${camera} · ${filters} filters`;
}
