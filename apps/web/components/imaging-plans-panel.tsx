"use client";

import { useMemo, useState } from "react";
import { imagingPlanModuleLabel, imagingPlanSummary, type ImagingPlanModule } from "@dss/core";
import { useImagingPlans } from "@/lib/use-imaging-plans";

export function ImagingPlansPanel() {
  const plansApi = useImagingPlans();
  const [filter, setFilter] = useState<ImagingPlanModule | "all">("all");

  const visible = useMemo(
    () => (filter === "all" ? plansApi.plans : plansApi.plans.filter((plan) => plan.module === filter)),
    [plansApi.plans, filter],
  );

  return (
    <div className="lists-panel">
      <p className="note">
        Named imaging plans saved from Planner modules. Stored in this browser.
      </p>

      <div className="multi-target-chip-row" role="group" aria-label="Filter imaging plans">
        {(
          [
            ["all", "All"],
            ["multi-target", "Multi-target"],
            ["single-target", "Single-target"],
            ["mosaic", "Mosaic"],
            ["multi-rigs", "Multi-rigs"],
            ["collage", "Collage"],
            ["asterisms", "Asterisms"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="chip"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="hub-card">
          <p className="note" style={{ margin: 0 }}>
            No imaging plans yet. Open a Planner module and use Save plan.
          </p>
        </div>
      ) : (
        <ul className="hub-list imaging-plans-list">
          {visible.map((plan) => (
            <li key={plan.id} className="hub-card imaging-plan-row">
              <div>
                <strong>{plan.name}</strong>
                <p className="note" style={{ margin: "4px 0 0" }}>
                  {imagingPlanModuleLabel(plan.module)} · {imagingPlanSummary(plan)}
                </p>
              </div>
              <div className="imaging-plan-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => plansApi.requestOpenPlan(plan.id, plan.module)}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    if (window.confirm(`Delete “${plan.name}”?`)) plansApi.deletePlan(plan.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
