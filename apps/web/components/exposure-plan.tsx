"use client";

import { filterKindLabel, formatHours, isNarrowband } from "@dss/core";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

export function ExposurePlan() {
  const { exposures, camera, bortle, optics } = usePlannerState();
  const narrowOnColour = camera?.sensor === "colour" && exposures.some((item) => isNarrowband(item.filter.kind));
  return (
    <Section index="09" title="Exposure">
      {exposures.length === 0 ? <p className="note">Choose at least one filter.</p> : null}
      <ul className="exposures">
        {exposures.map((item) => (
          <li key={item.filter.id}>
            <strong>{item.filter.name}</strong>
            <span>
              {filterKindLabel(item.filter.kind)} · {item.filter.bandpassNm} nm
            </span>
            <span>Sub {formatSub(item.subExposureSeconds)}</span>
            <span>
              Stack {formatHours(item.totalHours)} · {item.subCount} frames
            </span>
          </li>
        ))}
      </ul>
      {narrowOnColour ? (
        <p className="note">
          This camera is a colour sensor. A narrowband filter still works, but only the matching pixels collect that line.
        </p>
      ) : null}
      <p className="note">
        Subs are long enough for sky noise to reach about five times the nominal read noise, under a Bortle {bortle} sky
        {optics ? ` at f/${optics.focalRatio.toFixed(1)}` : ""}. The stack length is anchored at Bortle 4 and f/5, then
        stretched for a brighter sky and a slower focal ratio. It is a planning guess, not a signal-to-noise model of one
        object.
      </p>
    </Section>
  );
}

function formatSub(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)} s`;
  return `${(seconds / 60).toFixed(1)} min`;
}
