"use client";

import { filterKindLabel, formatHours, isNarrowband } from "@dss/core";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

export function ExposurePlan() {
  const { exposures, camera } = usePlannerState();
  const narrowOnColour = camera?.sensor === "colour" && exposures.some((item) => isNarrowband(item.filter.kind));
  return (
    <Section index="10" title="Integration">
      {exposures.length === 0 ? <p className="note">Choose at least one filter.</p> : null}
      <ul className="exposures">
        {exposures.map((item) => (
          <li key={item.filter.id}>
            <strong>{item.filter.name}</strong>
            <span>
              {filterKindLabel(item.filter.kind)} · {item.filter.bandpassNm} nm
            </span>
            <span>Sub {formatSub(item.subExposureSeconds)}</span>
            <span>Tonight {formatHours(item.tonightHours)}</span>
            <span>
              Full stack {formatHours(item.totalHours)} · {item.subCount} frames
            </span>
          </li>
        ))}
      </ul>
      {narrowOnColour ? (
        <p className="note">
          This camera is a colour sensor. A narrowband filter still works, but only the matching pixels collect that line.
        </p>
      ) : null}
      {exposures.map((item) => (
        <p key={`${item.filter.id}-why`} className="note">
          <strong>{item.filter.name}.</strong> {item.explanation}
        </p>
      ))}
    </Section>
  );
}

function formatSub(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)} s`;
  return `${(seconds / 60).toFixed(1)} min`;
}
