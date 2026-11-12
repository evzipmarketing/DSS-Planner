"use client";

import { bortleLabel } from "@dss/core";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

export function BortlePanel() {
  const { bortle, bortleMode, bortleEstimate, setBortleManual, useBortleEstimate } = usePlannerState();
  return (
    <Section index="02" title="Bortle">
      <p>
        Estimate: Bortle {bortleEstimate} · {bortleLabel(bortleEstimate)}
      </p>
      <p className="note">
        Coarse 1° estimate from NASA Black Marble 2016 city lights (VIIRS). It is not a sky-quality meter reading.
        {bortleMode === "manual" ? " The slider is overriding it." : " The slider is following the estimate."}
      </p>
      <label className="field">
        Bortle class
        <div className="inline">
          <span>1 · Dark</span>
          <span>
            {bortle} · {bortleLabel(bortle)}
          </span>
          <span>9 · Inner city</span>
        </div>
        <input
          type="range"
          min={1}
          max={9}
          step={1}
          value={bortle}
          onChange={(event) => setBortleManual(Number(event.target.value))}
        />
      </label>
      {bortleMode === "manual" ? (
        <button type="button" className="ghost" onClick={useBortleEstimate}>
          Use the estimate
        </button>
      ) : null}
    </Section>
  );
}
