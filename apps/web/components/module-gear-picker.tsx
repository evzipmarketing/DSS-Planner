"use client";

import { useEffect, useMemo, useState } from "react";
import { effectiveFocalLengthMm, type Telescope } from "@dss/core";
import { Combobox } from "./combobox";
import { NumericField } from "./numeric-field";
import { usePlannerState } from "./planner-context";

const REDUCERS = [
  { value: 1, label: "1.0× flattener or none" },
  { value: 0.8, label: "0.8× reducer" },
  { value: 0.75, label: "0.75× reducer" },
  { value: 0.63, label: "0.63× reducer" },
  { value: 2, label: "2× Barlow" },
];

export function ModuleGearPicker() {
  const planner = usePlannerState();
  const gearReady = Boolean(planner.telescope && planner.camera);
  const [open, setOpen] = useState(!gearReady);
  const rigLocked = Boolean(planner.activeRigId);
  const smartScope = Boolean(planner.telescope?.smart);
  const activeRig = planner.rigs.find((item) => item.id === planner.activeRigId) ?? null;

  useEffect(() => {
    // Keep the menu open until gear is complete; collapse once a rig/manual gear is ready.
    if (gearReady) setOpen(false);
    else setOpen(true);
  }, [gearReady, planner.activeRigId, planner.telescope?.id, planner.camera?.id]);

  const flLocked = planner.focalOverrideMm != null;

  const summary = useMemo(() => {
    // Custom FL replaces the catalogue scope name — same as Tonight gear chips.
    const scope =
      planner.focalOverrideMm != null
        ? `${planner.focalOverrideMm} mm`
        : (planner.telescope?.name ?? "No scope");
    const camera = planner.camera?.name ?? "No camera";
    const flat = smartScope
      ? "smart optics"
      : (REDUCERS.find((item) => item.value === planner.reducer)?.label ?? `${planner.reducer}×`);
    const prefix = activeRig?.name ?? "Manual";
    return `${prefix} · ${scope} · ${camera} · ${flat}`;
  }, [activeRig, planner.telescope, planner.camera, planner.reducer, smartScope, planner.focalOverrideMm]);

  const opticsLine = useMemo(() => {
    if (!planner.optics) return null;
    return `${planner.optics.field.widthArcmin.toFixed(1)}′ × ${planner.optics.field.heightArcmin.toFixed(1)}′ · ${Math.round(planner.optics.focalLengthMm)} mm · ${planner.optics.pixelScale.toFixed(2)}″/px`;
  }, [planner.optics]);

  const smartCameraIds = useMemo(
    () => new Set(planner.telescopes.flatMap((item) => (item.smart ? [item.smart.cameraId] : []))),
    [planner.telescopes],
  );

  const scopeOptions = useMemo(() => {
    const library = new Set(planner.libraryTelescopeIds);
    return [...planner.telescopes].sort((a, b) => {
      const aLib = library.has(a.id) ? 0 : 1;
      const bLib = library.has(b.id) ? 0 : 1;
      if (aLib !== bLib) return aLib - bLib;
      return a.name.localeCompare(b.name);
    });
  }, [planner.telescopes, planner.libraryTelescopeIds]);

  const cameraOptions = useMemo(() => {
    const library = new Set(planner.libraryCameraIds);
    return planner.cameraList
      .filter((item) => item.custom || !smartCameraIds.has(item.id))
      .sort((a, b) => {
        const aLib = library.has(a.id) ? 0 : 1;
        const bLib = library.has(b.id) ? 0 : 1;
        if (aLib !== bLib) return aLib - bLib;
        return a.name.localeCompare(b.name);
      });
  }, [planner.cameraList, planner.libraryCameraIds, smartCameraIds]);

  return (
    <div className="hub-card module-gear-picker">
      <button
        type="button"
        className="module-gear-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <strong>Gear</strong>
          <span className="note" style={{ display: "block", margin: "2px 0 0" }}>
            {summary}
          </span>
          {!open && opticsLine ? (
            <span className="note" style={{ display: "block", margin: "2px 0 0" }}>
              {opticsLine}
            </span>
          ) : null}
        </span>
        <span className="module-gear-chevron" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div className="module-gear-body">
          <div className="module-gear-fields">
            <label className="module-gear-field">
              Rig
              <select
                value={planner.activeRigId ?? ""}
                onChange={(event) => {
                  const id = event.target.value;
                  if (!id) planner.clearActiveRig();
                  else planner.selectRig(id);
                }}
              >
                <option value="">Manual</option>
                {planner.rigs.map((rig) => (
                  <option key={rig.id} value={rig.id}>
                    {rig.name}
                  </option>
                ))}
              </select>
            </label>

            {rigLocked || flLocked ? (
              <p className="stat module-gear-locked">
                <span>Telescope</span>
                <strong>
                  {flLocked
                    ? `${planner.focalOverrideMm} mm`
                    : (planner.telescope?.name ?? "From rig")}
                </strong>
              </p>
            ) : (
              <Combobox
                label="Telescope"
                value={planner.telescope?.id ?? ""}
                placeholder="e.g. Seestar S50, Evostar 72ED"
                preserveOrder
                options={scopeOptions.map((item) => ({
                  id: item.id,
                  label: item.name,
                  hint: item.smart
                    ? `Smart · ${item.apertureMm} mm · ${item.focalLengthMm} mm`
                    : `${item.apertureMm} mm · ${item.focalLengthMm} mm`,
                }))}
                onChange={(id) => planner.setTelescopeId(id)}
              />
            )}

            {smartScope ? (
              <p className="stat module-gear-locked">
                <span>Camera</span>
                <strong>{planner.camera?.name ?? "Paired camera"}</strong>
              </p>
            ) : rigLocked ? (
              <p className="stat module-gear-locked">
                <span>Camera</span>
                <strong>{planner.camera?.name ?? "From rig"}</strong>
              </p>
            ) : (
              <Combobox
                label="Camera"
                value={planner.camera?.id ?? ""}
                placeholder="e.g. ASI533"
                preserveOrder
                options={cameraOptions.map((item) => ({
                  id: item.id,
                  label: item.name,
                  hint: `${item.sensor} · ${item.widthPx}×${item.heightPx}`,
                }))}
                onChange={(id) => planner.setCameraId(id)}
              />
            )}

            <label className="module-gear-field">
              Flattener / reducer
              <select
                value={String(planner.reducer)}
                disabled={rigLocked || smartScope || !planner.telescope}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  planner.setReducer(next);
                  if (planner.telescope) planner.setTelescopePreferredReducer(planner.telescope.id, next);
                }}
              >
                {REDUCERS.map((item) => (
                  <option key={item.value} value={String(item.value)}>
                    {item.label}
                  </option>
                ))}
                {REDUCERS.some((item) => item.value === planner.reducer) ? null : (
                  <option value={String(planner.reducer)}>{planner.reducer}×</option>
                )}
              </select>
            </label>
          </div>

          {planner.telescope && !planner.telescope.smart ? (
            <ManualFocalLength telescope={planner.telescope} />
          ) : null}

          {opticsLine ? <p className="note module-gear-optics">{opticsLine}</p> : null}
          {flLocked ? (
            <p className="note module-gear-optics">
              Telescope locked by custom FL. Clear FL below to pick a catalogue scope again.
            </p>
          ) : null}
          {smartScope && !rigLocked ? (
            <p className="note module-gear-optics">Smart scopes use built-in optics.</p>
          ) : null}
          {rigLocked ? (
            <p className="note module-gear-optics">
              Locked by the selected rig. Switch to Manual to change scope and camera separately. Focal length can still
              be overridden above.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ManualFocalLength({ telescope }: { telescope: Telescope }) {
  const planner = usePlannerState();
  const computed = Math.round(effectiveFocalLengthMm(telescope, planner.reducer));
  return (
    <div className="module-gear-fl">
      {planner.focalOverrideMm != null ? (
        <p className="focal-hint">
          Using entered FL ({planner.focalOverrideMm} mm). Delete the value to remove it. Scope + corrector give{" "}
          {computed} mm.
        </p>
      ) : (
        <p className="focal-hint">
          Type a focal length to apply it automatically. Delete the value to remove the override. Scope + corrector
          give {computed} mm.
        </p>
      )}
      <NumericField
        label="FL (mm)"
        value={planner.focalOverrideMm}
        min={10}
        max={20_000}
        step={1}
        inputMode="numeric"
        placeholder={String(computed)}
        allowEmpty
        commitOnChange
        onCommit={(next) => {
          if (next == null) {
            planner.setFocalOverrideMm(null);
            return;
          }
          planner.setFocalOverrideMm(Math.round(next));
        }}
      />
    </div>
  );
}
