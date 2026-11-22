"use client";

const MODULES = [
  {
    title: "Multi-target planner",
    detail: "Compare targets in one night with overlapping altitude windows and hour budgets.",
  },
  {
    title: "Single-target planner",
    detail: "Multi-night capture plan for one object, paced around moon phase.",
  },
  {
    title: "Mosaic",
    detail: "Grid size, overlap, and panel framing for wide fields.",
  },
  {
    title: "Multi-rigs",
    detail: "Coordinate several scopes and cameras on the same night.",
  },
  {
    title: "Collage",
    detail: "Wide-angle framing that places several targets in one creative frame.",
  },
  {
    title: "Asterisms",
    detail: "Pattern and star-group framing helpers.",
  },
  {
    title: "Export CSV",
    detail: "Export tonight’s plan and saved target lists.",
  },
] as const;

export function PlannerHubPage() {
  return (
    <div className="hub-page">
      <header className="hub-intro">
        <h1>Planner</h1>
        <p>Longer sessions, mosaics, multi-rig nights, and exports — beyond tonight’s shortlist.</p>
      </header>
      <ul className="hub-list">
        {MODULES.map((module) => (
          <li key={module.title} className="hub-row">
            <div>
              <strong>{module.title}</strong>
              <p>{module.detail}</p>
            </div>
            <span className="hub-badge">Soon</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
