"use client";

import { useState } from "react";

export function SavePlanControl({
  disabled,
  disabledReason,
  defaultName,
  onSave,
}: {
  disabled?: boolean;
  disabledReason?: string;
  defaultName: string;
  onSave: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage("Enter a plan name.");
      return;
    }
    onSave(trimmed);
    setMessage("Saved to Imaging plans.");
    setOpen(false);
  }

  return (
    <div className="hub-card save-plan-card">
      {!open ? (
        <div className="save-plan-row">
          <div>
            <strong>Imaging plan</strong>
            <p className="note" style={{ margin: "4px 0 0" }}>
              {disabled && disabledReason ? disabledReason : "Save this setup to Profile → Imaging plans."}
            </p>
            {message ? <p className="note">{message}</p> : null}
          </div>
          <button type="button" className="primary" disabled={disabled} onClick={() => setOpen(true)}>
            Save plan
          </button>
        </div>
      ) : (
        <div className="save-plan-form">
          <label className="field">
            Plan name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={defaultName}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
            />
          </label>
          <div className="save-plan-actions">
            <button type="button" className="ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="primary" onClick={submit}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
