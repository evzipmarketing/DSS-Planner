"use client";

import { useState } from "react";
import { MultiTargetPanel } from "./multi-target-panel";
import { SingleTargetPanel } from "./single-target-panel";

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
    id: "mosaic",
    title: "Mosaic",
    detail: "Grid size, overlap, and panel framing for wide fields.",
    ready: false,
  },
  {
    id: "multi-rigs",
    title: "Multi-rigs",
    detail: "Coordinate several scopes and cameras on the same night.",
    ready: false,
  },
  {
    id: "collage",
    title: "Collage",
    detail: "Wide-angle framing that places several targets in one creative frame.",
    ready: false,
  },
  {
    id: "asterisms",
    title: "Asterisms",
    detail: "Pattern and star-group framing helpers.",
    ready: false,
  },
] as const;

type PlannerSection = "home" | "multi-target" | "single-target";

export function PlannerHubPage() {
  const [section, setSection] = useState<PlannerSection>("home");

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

  return (
    <div className="hub-page">
      <header className="hub-intro">
        <h1>Planner</h1>
        <p>Longer sessions, mosaics, and multi-rig nights — beyond tonight’s shortlist.</p>
      </header>
      <ul className="hub-list">
        {MODULES.map((module) => (
          <li key={module.id}>
            {module.ready ? (
              <button
                type="button"
                className="hub-row hub-row-btn"
                onClick={() => setSection(module.id as Exclude<PlannerSection, "home">)}
              >
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
    </div>
  );
}
