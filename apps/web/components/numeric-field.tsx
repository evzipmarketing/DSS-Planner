"use client";

import { useState } from "react";

export type NumericFieldProps = {
  label: string;
  value: number | null;
  onCommit: (value: number | null) => void;
  fallback?: number | null;
  min?: number;
  max?: number;
  step?: string | number;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
  allowEmpty?: boolean;
  hint?: string;
};

/**
 * Keeps the raw string while typing. Validates and clamps on blur or Enter.
 * Invalid or out-of-range input falls back to the previous valid value.
 */
export function NumericField({
  label,
  value,
  onCommit,
  fallback = null,
  min,
  max,
  step,
  placeholder,
  inputMode = "decimal",
  allowEmpty = true,
  hint,
}: NumericFieldProps) {
  const [text, setText] = useState(() => formatValue(value));
  const [syncedValue, setSyncedValue] = useState(value);
  const [revertHint, setRevertHint] = useState(false);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(formatValue(value));
    setRevertHint(false);
  }

  function commit() {
    const trimmed = text.trim();
    if (trimmed === "") {
      if (allowEmpty) {
        onCommit(null);
        setText("");
        setRevertHint(false);
        return;
      }
      const restore = value ?? fallback;
      setText(formatValue(restore));
      setRevertHint(true);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      const restore = value ?? fallback;
      setText(formatValue(restore));
      setRevertHint(true);
      return;
    }
    let next = parsed;
    if (min != null && next < min) next = min;
    if (max != null && next > max) next = max;
    if (next !== parsed) setRevertHint(true);
    else setRevertHint(false);
    onCommit(next);
    setText(formatValue(next));
  }

  return (
    <label className="field">
      {label}
      <input
        value={text}
        placeholder={placeholder}
        inputMode={inputMode}
        step={step}
        onChange={(event) => {
          setText(event.target.value);
          setRevertHint(false);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
      {revertHint ? <span className="focal-hint">Kept the last valid value.</span> : null}
      {!revertHint && hint ? <span className="focal-hint">{hint}</span> : null}
    </label>
  );
}

function formatValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}
