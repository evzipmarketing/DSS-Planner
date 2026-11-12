"use client";

import { addDaysIso, civilDate } from "@dss/core";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

export function DatePanel() {
  const { date, setDate, site } = usePlannerState();
  const today = civilDate(site.timezone);
  return (
    <Section index="03" title="Date">
      <div className="day-row">
        <button type="button" className="day" onClick={() => setDate(addDaysIso(date, -1))}>
          Previous day
        </button>
        <button type="button" className="day" aria-pressed={date === today} onClick={() => setDate(today)}>
          Today
        </button>
        <button type="button" className="day" onClick={() => setDate(addDaysIso(date, 1))}>
          Next day
        </button>
      </div>
      <label className="field">
        Night of
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <p className="note">The night runs from local noon to the next local noon, in {site.timezone}.</p>
    </Section>
  );
}
