"use client";

import { useEffect, useRef, useState } from "react";

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
  /** Commit valid numbers while typing so closed settings chips stay in sync. */
  commitOnChange?: boolean;
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
  commitOnChange = false,
}: NumericFieldProps) {
  const [text, setText] = useState(() => formatValue(value));
  const [syncedValue, setSyncedValue] = useState(value);
  const [revertHint, setRevertHint] = useState(false);
  const textRef = useRef(text);
  const onCommitRef = useRef(onCommit);
  textRef.current = text;
  onCommitRef.current = onCommit;

  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(formatValue(value));
    setRevertHint(false);
  }

  function commit(raw = text, soft = false) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      if (allowEmpty) {
        onCommit(null);
        if (!soft) setText("");
        setRevertHint(false);
        return;
      }
      if (soft) return;
      const restore = value ?? fallback;
      setText(formatValue(restore));
      setRevertHint(true);
      return;
    }
    if (soft && trimmed.endsWith(".")) return;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      if (soft) return;
      const restore = value ?? fallback;
      setText(formatValue(restore));
      setRevertHint(true);
      return;
    }
    let next = parsed;
    if (min != null && next < min) {
      if (soft) return;
      next = min;
    }
    if (max != null && next > max) {
      if (soft) return;
      next = max;
    }
    if (!soft && next !== parsed) setRevertHint(true);
    else setRevertHint(false);
    onCommit(next);
    if (!soft) setText(formatValue(next));
  }

  useEffect(() => {
    if (!commitOnChange) return;
    return () => {
      const trimmed = textRef.current.trim();
      if (trimmed === "") {
        if (allowEmpty) onCommitRef.current(null);
        return;
      }
      if (trimmed.endsWith(".")) return;
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      if (min != null && parsed < min) return;
      if (max != null && parsed > max) return;
      onCommitRef.current(parsed);
    };
  }, [allowEmpty, commitOnChange, max, min]);

  return (
    <label className="field">
      {label}
      <input
        value={text}
        placeholder={placeholder}
        inputMode={inputMode}
        step={step}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          setRevertHint(false);
          if (commitOnChange) commit(next, true);
        }}
        onBlur={() => commit()}
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
