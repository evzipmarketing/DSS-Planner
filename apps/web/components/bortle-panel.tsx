"use client";

import { bortleLabel } from "@dss/core";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

export function BortlePanel() {
  const { bortle, bortleLoading } = usePlannerState();
  return (
    <Section index="02" title="Bortle">
      <p className="bortle-readout">
        {bortleLoading
          ? "Updating estimate…"
          : `Estimate: Bortle ${bortle} · ${bortleLabel(bortle)}`}
      </p>
      <p className="focal-hint">
        Coarse 1° estimate from NASA Black Marble 2016 city lights (VIIRS). It is not a sky-quality meter reading.
      </p>
    </Section>
  );
}
