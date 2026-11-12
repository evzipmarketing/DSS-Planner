"use client";

import { useId, useMemo, useState } from "react";

export type ComboOption = { id: string; label: string; hint?: string };

export function Combobox({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: ComboOption[];
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const selected = options.find((option) => option.id === value);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();
  const matches = useMemo(() => {
    const query = text.trim().toLowerCase();
    const pool = query
      ? options.filter((option) => `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(query))
      : options;
    return pool.slice(0, 12);
  }, [options, text]);

  return (
    <div className="combo">
      <label className="field">
        {label}
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={open ? text : (selected?.label ?? "")}
          onFocus={() => {
            setText("");
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
        />
      </label>
      {open ? (
        <div className="combo-list" id={listId} role="listbox">
          {matches.length === 0 ? <p className="note">No match. Try another name, or enter it manually.</p> : null}
          {matches.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              className="combo-option"
              aria-selected={option.id === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
            >
              {option.label}
              {option.hint ? <small>{option.hint}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
