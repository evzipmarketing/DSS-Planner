"use client";

import { useEffect, useState, type ReactNode } from "react";
import { effectiveFocalLengthMm, shortPlaceName } from "@dss/core";
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
import type { Planner } from "@/lib/use-planner";

type SettingsPanel = "location" | "date" | "rig" | "telescope" | "flattener" | "camera";

const REDUCER_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "1.0× flattener or none" },
  { value: 0.8, label: "0.8× reducer" },
  { value: 0.75, label: "0.75× reducer" },
  { value: 0.63, label: "0.63× reducer" },
  { value: 2, label: "2× Barlow" },
];

function reducerLabel(value: number): string {
  return REDUCER_LABELS.find((item) => item.value === value)?.label ?? `${value}×`;
}

export function TonightPage() {
  const planner = usePlannerState();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<SettingsPanel | null>(null);
  const place = planner.locationReady ? planner.site.name : planner.placeStatus === "detecting" ? "Detecting…" : "Set location";
  const day = formatDay(planner.date);
  const activeRig = planner.rigs.find((item) => item.id === planner.activeRigId) ?? null;
  const rigLocked = Boolean(planner.activeRigId);
  const smartLocked = Boolean(planner.telescope?.smart);
  const flattenerLocked = rigLocked || smartLocked;
  const scope = telescopeChipLabel(planner);
  const camera = cameraLabel(planner.camera?.name, planner.filterIds.length, true);
  const flattener = smartLocked ? "Built-in optics" : reducerLabel(planner.reducer);

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
    <div className="tonight">
      <section className="hero hero-with-settings">
        <div className="hero-copy">
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
        <div className="hero-toolbar">
          <div id="tonight-list-tools" className="tonight-list-tools" />
          <button
            type="button"
            className={`settings-toggle${open ? " is-open" : ""}`}
            aria-label="Observatory settings"
            aria-expanded={open}
            aria-controls={open ? "settings-panel" : undefined}
            title="Location, date, rig, telescope, and camera"
            onClick={toggleSettings}
          >
            <SlidersIcon />
          </button>
        </div>
      </section>
      {open ? (
        <div className="settings-bar settings-open">
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
              icon={<RigIcon />}
              prefix="Rig"
              value={activeRig?.name ?? "Manual"}
              label={`Rig, ${activeRig?.name ?? "Manual scope + camera"}`}
              open={panel === "rig"}
              onToggle={() => choose("rig")}
            />
            <Control
              icon={<TelescopeIcon />}
              prefix="Telescope"
              value={scope}
              label={`Telescope, ${scope}${rigLocked ? ", locked by rig" : ""}`}
              open={panel === "telescope"}
              onToggle={() => choose("telescope")}
              locked={rigLocked}
            />
            <Control
              icon={<FlattenerIcon />}
              prefix="Flattener"
              value={flattener}
              label={`Flattener, ${flattener}${flattenerLocked ? ", locked" : ""}`}
              open={panel === "flattener"}
              onToggle={() => choose("flattener")}
              locked={flattenerLocked}
            />
            <Control
              icon={<CameraIcon />}
              prefix="Camera"
              value={camera}
              label={`Camera, ${camera}${rigLocked ? ", locked by rig" : ""}`}
              open={panel === "camera"}
              onToggle={() => choose("camera")}
              locked={rigLocked}
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
  locked = false,
}: {
  icon: ReactNode;
  prefix: string;
  value: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  locked?: boolean;
}) {
  return (
    <span className="pop">
      <button
        type="button"
        className={`chip-btn${locked ? " is-locked" : ""}`}
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
    case "rig":
      return <RigPickerPanel onDone={onDone} />;
    case "telescope":
      return <RigPanel part="telescope" onDone={onDone} />;
    case "flattener":
      return <FlattenerPanel onDone={onDone} />;
    case "camera":
      return <RigPanel part="camera" onDone={onDone} />;
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
    case "rig":
      return "Rig";
    case "telescope":
      return "Telescope";
    case "flattener":
      return "Flattener";
    case "camera":
      return "Camera";
    default: {
      const unexpected: never = panel;
      return unexpected;
    }
  }
}

function RigPickerPanel({ onDone }: { onDone: () => void }) {
  const planner = usePlannerState();
  return (
    <div className="block" style={{ display: "grid", gap: 10 }}>
      <p className="note" style={{ margin: 0 }}>
        Choosing a saved rig sets scope, flattener, camera, and filter together and locks manual gear picks. Manage rigs under
        Profile → Equipment.
      </p>
      <button
        type="button"
        className={`ghost rig-option${!planner.activeRigId ? " is-selected" : ""}`}
        onClick={() => {
          planner.clearActiveRig();
          onDone();
        }}
      >
        <strong>Manual scope + camera</strong>
        <span>Pick telescope and camera separately</span>
      </button>
      {planner.rigs.length === 0 ? (
        <p className="note" style={{ margin: 0 }}>
          No saved rigs yet.
        </p>
      ) : (
        planner.rigs.map((rig) => {
          const selected = planner.activeRigId === rig.id;
          const scope = planner.telescopes.find((item) => item.id === rig.telescopeId);
          const camera = planner.cameraList.find((item) => item.id === rig.cameraId);
          return (
            <button
              key={rig.id}
              type="button"
              className={`ghost rig-option${selected ? " is-selected" : ""}`}
              onClick={() => {
                planner.selectRig(rig.id);
                onDone();
              }}
            >
              <strong>{rig.name}</strong>
              <span>
                {[scope?.name ?? rig.telescopeId, camera?.name ?? rig.cameraId, `${rig.reducer}×`].filter(Boolean).join(" · ")}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}

function FlattenerPanel({ onDone }: { onDone: () => void }) {
  const planner = usePlannerState();

  if (planner.activeRigId) {
    return (
      <div className="block" style={{ display: "grid", gap: 10 }}>
        <p className="note" style={{ margin: 0 }}>
          Flattener is locked by the selected rig. Switch to Manual under Rig to change it separately.
        </p>
        <p className="stat">
          <strong>{reducerLabel(planner.reducer)}</strong>
        </p>
        <button type="button" className="ghost" onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

  if (planner.telescope?.smart) {
    return (
      <div className="block" style={{ display: "grid", gap: 10 }}>
        <p className="note" style={{ margin: 0 }}>
          Smart scopes use built-in optics. No separate flattener or reducer applies.
        </p>
        <button type="button" className="ghost" onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="block" style={{ display: "grid", gap: 8 }}>
      <p className="note" style={{ margin: 0 }}>
        Choose the flattener, reducer, or Barlow on this scope.
      </p>
      {REDUCER_LABELS.map((item) => {
        const selected = planner.reducer === item.value;
        return (
          <button
            key={item.value}
            type="button"
            className={`ghost rig-option${selected ? " is-selected" : ""}`}
            onClick={() => {
              planner.setReducer(item.value);
              if (planner.telescope) {
                planner.setTelescopePreferredReducer(planner.telescope.id, item.value);
              }
              onDone();
            }}
          >
            <strong>{item.label}</strong>
          </button>
        );
      })}
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

export function ThemeToggle() {
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

function RigIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16v10H4z" />
      <path d="M8 7V5h8v2M8 17v2h8v-2" />
    </svg>
  );
}

function FlattenerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
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

function telescopeChipLabel(planner: Planner): string {
  const telescope = planner.telescope;
  // Custom FL replaces the catalogue name on the closed chip — don't keep both.
  if (planner.focalOverrideMm != null) {
    return `${planner.focalOverrideMm} mm`;
  }
  const name = trimGear(telescope?.name) ?? "Choose…";
  if (!telescope) return name;
  if (planner.optics) {
    return `${name} · ${Math.round(planner.optics.focalLengthMm)} mm`;
  }
  const focalMm = telescope.smart
    ? (planner.smartMode?.focalLengthMm ?? telescope.focalLengthMm)
    : effectiveFocalLengthMm(telescope, planner.reducer);
  return `${name} · ${Math.round(focalMm)} mm`;
}

function cameraLabel(name: string | undefined, filters: number, emptyHint = false): string {
  const camera = trimGear(name) ?? (emptyHint ? "Choose…" : "None");
  if (!name) return camera;
  if (filters <= 1) return camera;
  return `${camera} · ${filters} filters`;
}
