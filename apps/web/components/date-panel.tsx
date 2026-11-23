"use client";

import { useEffect, useId, useRef, useState } from "react";
import { addDaysIso, civilDate } from "@dss/core";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

/** Convert YYYY-MM-DD → MM-DD-YYYY for display. */
function isoToDisplayDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match?.[1] || !match[2] || !match[3]) return iso;
  return `${match[2]}-${match[3]}-${match[1]}`;
}

/** Convert MM-DD-YYYY → YYYY-MM-DD, or null if invalid. */
function displayToIsoDate(display: string): string | null {
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(display.trim());
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DatePanel({ onDone }: { onDone?: () => void }) {
  const { date, setDate, site } = usePlannerState();
  const today = civilDate(site.timezone);
  const [text, setText] = useState(() => isoToDisplayDate(date));
  const pickerRef = useRef<HTMLInputElement>(null);
  const pickerId = useId();

  useEffect(() => {
    setText(isoToDisplayDate(date));
  }, [date]);

  function pick(next: string) {
    setDate(next);
    setText(isoToDisplayDate(next));
    onDone?.();
  }

  function commitText(next: string) {
    setText(next);
    const iso = displayToIsoDate(next);
    if (!iso) return;
    setDate(iso);
    onDone?.();
  }

  return (
    <Section index="03" title="Date">
      <div className="date-nav-row">
        <label className="date-field date-field-inline" htmlFor={`${pickerId}-text`}>
          <span className="sr-only">Night of (MM-DD-YYYY)</span>
          <span className="date-field-control">
            <input
              id={`${pickerId}-text`}
              type="text"
              inputMode="numeric"
              placeholder="MM-DD-YYYY"
              aria-label="Night of (MM-DD-YYYY)"
              value={text}
              onChange={(event) => commitText(event.target.value)}
              onBlur={() => {
                const iso = displayToIsoDate(text);
                setText(iso ? isoToDisplayDate(iso) : isoToDisplayDate(date));
              }}
            />
            <button
              type="button"
              className="date-picker-btn"
              aria-label="Open calendar"
              title="Open calendar"
              onClick={() => {
                const input = pickerRef.current;
                if (!input) return;
                if (typeof input.showPicker === "function") input.showPicker();
                else input.click();
              }}
            >
              <CalendarIcon />
            </button>
            <input
              ref={pickerRef}
              className="date-picker-native"
              type="date"
              value={date}
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                if (!event.target.value) return;
                pick(event.target.value);
              }}
            />
          </span>
        </label>
        <div className="day-row">
          <button type="button" className="day" onClick={() => pick(addDaysIso(date, -1))}>
            Previous day
          </button>
          <button type="button" className="day" aria-pressed={date === today} onClick={() => pick(today)}>
            Today
          </button>
          <button type="button" className="day" onClick={() => pick(addDaysIso(date, 1))}>
            Next day
          </button>
        </div>
      </div>
      <p className="note">The night runs from local noon to the next local noon, in {site.timezone}.</p>
    </Section>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10h17" />
    </svg>
  );
}
