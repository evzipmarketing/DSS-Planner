"use client";

import { useMemo } from "react";
import { buildPlanCsv, frameFillPercent, objectTitle, planCsvRowFromTarget } from "@dss/core";
import { constellationName } from "@dss/data";
import { usePlannerState } from "./planner-context";

export function TargetCsvExport() {
  const planner = usePlannerState();
  const object = planner.selected;

  const ranked = useMemo(
    () => (object ? planner.shortlist.find((item) => item.object.id === object.id) : undefined),
    [planner.shortlist, object],
  );

  const field = planner.optics
    ? { widthArcmin: planner.optics.field.widthArcmin, heightArcmin: planner.optics.field.heightArcmin }
    : null;

  if (!object) return null;
  const target = object;

  function downloadCsv() {
    const csv = buildPlanCsv([
      planCsvRowFromTarget({
        object: target,
        frameFillPercent: ranked?.frameFillPercent ?? frameFillPercent(target.majorArcmin, field),
        usableHours: ranked?.usableHours ?? null,
        band: ranked?.band ?? null,
        constellation: target.constellation ? constellationName(target.constellation) : "",
        listName: ranked ? "Tonight" : "",
      }),
    ]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    const slug =
      objectTitle(target)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || target.id;
    anchor.href = url;
    anchor.download = `deepskymate-${slug}-${stamp}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="target-csv-export">
      <button type="button" className="ghost" onClick={downloadCsv}>
        Export CSV
      </button>
    </div>
  );
}
