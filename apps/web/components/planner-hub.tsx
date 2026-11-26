"use client";

import { useEffect, useState } from "react";
import type { ImagingPlanModule } from "@dss/core";
import { AsterismsPanel } from "./asterisms-panel";
import { CollagePanel } from "./collage-panel";
import { MosaicPanel } from "./mosaic-panel";
import { MultiRigsPanel } from "./multi-rigs-panel";
import { MultiTargetPanel } from "./multi-target-panel";
import { PlannerModuleIcon, type PlannerModuleIconId } from "./planner-module-icons";
import { SingleTargetPanel } from "./single-target-panel";

const VIEW_KEY = "dss-planner.hub-view.v1";

const MODULES = [
  {
    id: "multi-target",
    title: "Multi-target planner",
    detail: "Compare targets in one night with overlapping altitude windows and hour budgets.",
    ready: true,
  },
  {
    id: "single-target",
    title: "Single-target planner",
    detail: "Multi-night capture plan for one object, paced around moon phase.",
    ready: true,
  },
  {
    id: "multi-rigs",
    title: "Multi-rigs",
    detail: "Coordinate several scopes and cameras on the same night.",
    ready: true,
  },
  {
    id: "mosaic",
    title: "Mosaic",
    detail: "Grid size, overlap, and panel framing for wide fields.",
    ready: true,
  },
  {
    id: "collage",
    title: "Collage",
    detail: "Wide-angle framing that places several targets in one creative frame.",
    ready: true,
  },
  {
    id: "asterisms",
    title: "Asterisms",
    detail: "Pattern and star-group framing helpers.",
    ready: true,
  },
] as const satisfies ReadonlyArray<{
  id: PlannerModuleIconId;
  title: string;
  detail: string;
  ready: boolean;
}>;

type PlannerSection = "home" | "multi-target" | "single-target" | "multi-rigs" | "mosaic" | "collage" | "asterisms";
type HubView = "list" | "grid";

export function PlannerHubPage() {
  const [section, setSection] = useState<PlannerSection>("home");
  const [view, setView] = useState<HubView>("list");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(VIEW_KEY);
      if (raw === "grid" || raw === "list") setView(raw);
    } catch {
      // ignore storage failures
    }
  }, []);

  function changeView(next: HubView) {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // ignore storage failures
    }
  }

  useEffect(() => {
    function openPending(detail?: { module?: ImagingPlanModule }) {
      const module = detail?.module ?? readPendingModule();
      if (!module) return;
      if (
        module === "multi-target" ||
        module === "single-target" ||
        module === "multi-rigs" ||
        module === "mosaic" ||
        module === "collage" ||
        module === "asterisms"
      ) {
        setSection(module);
      }
    }
    function onOpen(event: Event) {
      const custom = event as CustomEvent<{ module?: ImagingPlanModule }>;
      openPending(custom.detail);
    }
    openPending();
    window.addEventListener("dss-open-imaging-plan", onOpen);
    return () => window.removeEventListener("dss-open-imaging-plan", onOpen);
  }, []);

  if (section === "multi-target") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Planner
        </button>
        <header className="hub-intro">
          <h1>Multi-target planner</h1>
        </header>
        <MultiTargetPanel />
      </div>
    );
  }

  if (section === "single-target") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Planner
        </button>
        <header className="hub-intro">
          <h1>Single-target planner</h1>
        </header>
        <SingleTargetPanel />
      </div>
    );
  }

  if (section === "multi-rigs") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Planner
        </button>
        <header className="hub-intro">
          <h1>Multi-rigs</h1>
        </header>
        <MultiRigsPanel />
      </div>
    );
  }

  if (section === "mosaic") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Planner
        </button>
        <header className="hub-intro">
          <h1>Mosaic</h1>
        </header>
        <MosaicPanel />
      </div>
    );
  }

  if (section === "collage") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Planner
        </button>
        <header className="hub-intro">
          <h1>Collage</h1>
        </header>
        <CollagePanel />
      </div>
    );
  }

  if (section === "asterisms") {
    return (
      <div className="hub-page">
        <button type="button" className="ghost hub-back" onClick={() => setSection("home")}>
          ← Planner
        </button>
        <header className="hub-intro">
          <h1>Asterisms</h1>
        </header>
        <AsterismsPanel />
      </div>
    );
  }

  return (
    <div className="hub-page">
      <header className="hub-intro">
        <div className="hub-intro-top">
          <h1>Planner</h1>
          <div className="hub-view-toggle" role="group" aria-label="Module layout">
            <button
              type="button"
              className={`hub-view-btn${view === "list" ? " is-active" : ""}`}
              aria-pressed={view === "list"}
              aria-label="List view"
              title="List view"
              onClick={() => changeView("list")}
            >
              <ListViewIcon />
            </button>
            <button
              type="button"
              className={`hub-view-btn${view === "grid" ? " is-active" : ""}`}
              aria-pressed={view === "grid"}
              aria-label="Grid view"
              title="Grid view"
              onClick={() => changeView("grid")}
            >
              <GridViewIcon />
            </button>
          </div>
        </div>
        <p>Longer sessions, mosaics, and multi-rig nights — beyond tonight’s shortlist.</p>
      </header>
      {view === "grid" ? (
        <ul className="hub-grid">
          {MODULES.map((module) => (
            <li key={module.id}>
              {module.ready ? (
                <button
                  type="button"
                  className="hub-tile hub-tile-btn"
                  onClick={() => setSection(module.id as Exclude<PlannerSection, "home">)}
                >
                  <span className="hub-thumb" aria-hidden="true">
                    <PlannerModuleIcon id={module.id} />
                  </span>
                  <strong>{module.title}</strong>
                  <p>{module.detail}</p>
                </button>
              ) : (
                <div className="hub-tile">
                  <span className="hub-thumb" aria-hidden="true">
                    <PlannerModuleIcon id={module.id} />
                  </span>
                  <div className="hub-tile-head">
                    <strong>{module.title}</strong>
                    <span className="hub-badge">Soon</span>
                  </div>
                  <p>{module.detail}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="hub-list">
          {MODULES.map((module) => (
            <li key={module.id}>
              {module.ready ? (
                <button
                  type="button"
                  className="hub-row hub-row-btn"
                  onClick={() => setSection(module.id as Exclude<PlannerSection, "home">)}
                >
                  <span className="hub-thumb hub-thumb-sm" aria-hidden="true">
                    <PlannerModuleIcon id={module.id} />
                  </span>
                  <div>
                    <strong>{module.title}</strong>
                    <p>{module.detail}</p>
                  </div>
                  <span className="hub-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              ) : (
                <div className="hub-row">
                  <span className="hub-thumb hub-thumb-sm" aria-hidden="true">
                    <PlannerModuleIcon id={module.id} />
                  </span>
                  <div>
                    <strong>{module.title}</strong>
                    <p>{module.detail}</p>
                  </div>
                  <span className="hub-badge">Soon</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListViewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

function GridViewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </svg>
  );
}

function readPendingModule(): ImagingPlanModule | null {
  try {
    const raw = window.sessionStorage.getItem("dss-planner.open-plan.v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { module?: ImagingPlanModule };
    return parsed.module ?? null;
  } catch {
    return null;
  }
}
