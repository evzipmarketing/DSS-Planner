"use client";

import { useState } from "react";
import {
  effectiveFocalLengthMm,
  filterKindLabel,
  samplingSummary,
  type Camera,
  type FilterKind,
  type ImagingFilter,
  type SensorKind,
  type Telescope,
} from "@dss/core";
import { Combobox } from "./combobox";
import { NumericField } from "./numeric-field";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

const REDUCERS = [
  { value: 1, label: "1.0× flattener or none" },
  { value: 0.8, label: "0.8× reducer" },
  { value: 0.75, label: "0.75× reducer" },
  { value: 0.63, label: "0.63× reducer" },
  { value: 2, label: "2× Barlow" },
];

const KINDS: FilterKind[] = [
  "broadband",
  "uv_ir_cut",
  "dual_narrowband",
  "tri_narrowband",
  "quad_narrowband",
  "ha",
  "oiii",
  "sii",
  "luminance",
  "red",
  "green",
  "blue",
];

export function RigPanel({ part = "all" }: { part?: "all" | "telescope" | "camera" }) {
  const planner = usePlannerState();
  const { telescope, camera, optics } = planner;
  const showScope = part !== "camera";
  const showCamera = part !== "telescope";
  const title = part === "telescope" ? "Telescope" : part === "camera" ? "Camera" : "Rig";

  return (
    <Section index="05" title={title}>
      {part === "all" && optics && telescope && camera ? (
        <>
          <div className="readout">
            <p className="stat">
              <span>Field</span>
              <strong>
                {optics.field.widthArcmin.toFixed(1)}′ × {optics.field.heightArcmin.toFixed(1)}′
              </strong>
            </p>
            <p className="stat">
              <span>Scale</span>
              <strong>{optics.pixelScale.toFixed(2)}″/px</strong>
            </p>
            <p className="stat">
              <span>Focal length</span>
              <strong>{Math.round(optics.focalLengthMm)} mm</strong>
            </p>
            <p className="stat">
              <span>Focal ratio</span>
              <strong>f/{optics.focalRatio.toFixed(1)}</strong>
            </p>
          </div>
          <p>{samplingSummary(optics.sampling)}</p>
          {optics.disagreement ? (
            <p className="warn">
              Pixel size and sensor {optics.disagreement.axis} disagree by about{" "}
              {Math.round(Math.abs(optics.disagreement.ratio - 1) * 100)}%. Field of view uses the sensor size; image scale uses the
              pixel size.
            </p>
          ) : null}
        </>
      ) : null}

      <div className="fields">
        {showScope ? (
          <>
            <Combobox
              label="Telescope"
              value={telescope?.id ?? ""}
              placeholder="e.g. Evostar 72ED"
              options={planner.telescopes.map((item) => ({
                id: item.id,
                label: item.name,
                hint: `${item.apertureMm} mm · ${item.focalLengthMm} mm`,
              }))}
              onChange={planner.setTelescopeId}
            />
            {telescope ? (
              <p className="note">
                {telescope.apertureMm} mm aperture, {telescope.focalLengthMm} mm native focal length.
              </p>
            ) : null}
            <label className="field">
              Flattener, reducer, or Barlow
              <select
                value={String(planner.reducer)}
                onChange={(event) => planner.setReducer(Number(event.target.value))}
              >
                {REDUCERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
                {REDUCERS.some((item) => item.value === planner.reducer) ? null : (
                  <option value={String(planner.reducer)}>{planner.reducer}×</option>
                )}
              </select>
            </label>
            {telescope ? <FocalLength telescope={telescope} /> : null}
          </>
        ) : null}
        {showCamera ? (
          <>
            <Combobox
              label="Camera"
              value={camera?.id ?? ""}
              placeholder="e.g. ASI533"
              options={planner.cameraList.map((item) => ({
                id: item.id,
                label: item.name,
                hint: `${item.sensor} · ${item.widthPx}×${item.heightPx}`,
              }))}
              onChange={planner.setCameraId}
            />
            <Combobox
              label="Add a filter"
              value=""
              placeholder="e.g. Astronomik"
              options={planner.filterList.map((item) => ({
                id: item.id,
                label: item.name,
                hint: filterKindLabel(item.kind),
              }))}
              onChange={(id) => {
                if (!planner.filterIds.includes(id)) planner.toggleFilter(id);
              }}
            />
            <div className="chips">
              {planner.filterIds.length === 0 ? <p className="focal-hint">No filter.</p> : null}
              {planner.filterList
                .filter((item) => planner.filterIds.includes(item.id))
                .map((item) => (
                  <button key={item.id} type="button" className="chip" onClick={() => planner.toggleFilter(item.id)}>
                    {item.name} · {filterKindLabel(item.kind)} ×
                  </button>
                ))}
            </div>
          </>
        ) : null}
      </div>

      <CustomGear part={part} />
    </Section>
  );
}

function FocalLength({ telescope }: { telescope: Telescope }) {
  const planner = usePlannerState();
  const computed = Math.round(effectiveFocalLengthMm(telescope, planner.reducer));
  const active = planner.focalOverrideMm ?? computed;
  return (
    <>
      <p className="focal-readout">Focal length {active} mm</p>
      {planner.focalOverrideMm != null ? (
        <p className="focal-hint">Using the number you enter. The scope and corrector give {computed} mm.</p>
      ) : null}
      <NumericField
        label="Enter a focal length (mm)"
        value={planner.focalOverrideMm}
        fallback={computed}
        min={10}
        max={20_000}
        step={1}
        inputMode="numeric"
        placeholder="e.g. 800"
        allowEmpty
        onCommit={(next) => {
          if (next == null) {
            planner.setFocalOverrideMm(null);
            return;
          }
          planner.setFocalOverrideMm(Math.round(next));
        }}
      />
    </>
  );
}

function CustomGear({ part }: { part: "all" | "telescope" | "camera" }) {
  const planner = usePlannerState();
  return (
    <>
      {part !== "camera" ? (
        <details className="drawer">
          <summary>Custom telescope</summary>
          <ScopeForm
            onSave={(scope) => {
              planner.addTelescope(scope);
            }}
          />
        </details>
      ) : null}
      {part !== "telescope" ? (
        <>
          <details className="drawer">
            <summary>Custom camera</summary>
            <CameraForm onSave={(camera) => planner.addCamera(camera)} />
          </details>
          <details className="drawer">
            <summary>Custom filter</summary>
            <FilterForm onSave={(filter) => planner.addFilter(filter)} />
          </details>
        </>
      ) : null}
      <div className="custom-list">
        {planner.telescopes.filter((item) => item.custom).map((item) => (
          <button key={item.id} type="button" className="ghost" onClick={() => planner.removeCustom("telescope", item.id)}>
            Remove {item.name}
          </button>
        ))}
        {planner.cameraList.filter((item) => item.custom).map((item) => (
          <button key={item.id} type="button" className="ghost" onClick={() => planner.removeCustom("camera", item.id)}>
            Remove {item.name}
          </button>
        ))}
        {planner.filterList.filter((item) => item.custom).map((item) => (
          <button key={item.id} type="button" className="ghost" onClick={() => planner.removeCustom("filter", item.id)}>
            Remove {item.name}
          </button>
        ))}
      </div>
    </>
  );
}

function ScopeForm({ onSave }: { onSave: (scope: Telescope) => void }) {
  const [name, setName] = useState("");
  const [aperture, setAperture] = useState<number | null>(80);
  const [focal, setFocal] = useState<number | null>(480);
  const [error, setError] = useState("");
  return (
    <form
      className="fields"
      onSubmit={(event) => {
        event.preventDefault();
        const apertureMm = aperture ?? 0;
        const focalLengthMm = focal ?? 0;
        if (!name.trim() || !(apertureMm > 0) || !(focalLengthMm > 0)) {
          setError("Name, aperture, and focal length need positive values.");
          return;
        }
        onSave({ id: `custom-${crypto.randomUUID()}`, name: name.trim(), apertureMm, focalLengthMm, custom: true });
        setName("");
        setError("");
      }}
    >
      <label className="field">Name<input value={name} placeholder="e.g. My 80 mm refractor" onChange={(event) => setName(event.target.value)} /></label>
      <NumericField label="Aperture (mm)" value={aperture} fallback={80} min={1} max={2000} placeholder="e.g. 80" allowEmpty={false} onCommit={setAperture} />
      <NumericField label="Focal length (mm)" value={focal} fallback={480} min={1} max={20000} placeholder="e.g. 480" allowEmpty={false} onCommit={setFocal} />
      {error ? <p className="warn">{error}</p> : null}
      <button type="submit" className="vision">Save telescope</button>
    </form>
  );
}

function CameraForm({ onSave }: { onSave: (camera: Camera) => void }) {
  const [name, setName] = useState("");
  const [width, setWidth] = useState<number | null>(11.31);
  const [height, setHeight] = useState<number | null>(11.31);
  const [pixel, setPixel] = useState<number | null>(3.76);
  const [cols, setCols] = useState<number | null>(3008);
  const [rows, setRows] = useState<number | null>(3008);
  const [sensor, setSensor] = useState<SensorKind>("colour");
  const [noise, setNoise] = useState<number | null>(1.5);
  const [error, setError] = useState("");
  return (
    <form
      className="fields"
      onSubmit={(event) => {
        event.preventDefault();
        const widthPx = cols ?? 0;
        const heightPx = rows ?? 0;
        let sensorWidthMm = width ?? 0;
        let sensorHeightMm = height ?? 0;
        let pixelSizeUm = pixel ?? 0;
        if (!(pixelSizeUm > 0) && sensorWidthMm > 0 && widthPx > 0) {
          pixelSizeUm = (sensorWidthMm / widthPx) * 1000;
          if (!(sensorHeightMm > 0) && heightPx > 0) sensorHeightMm = (heightPx * pixelSizeUm) / 1000;
        }
        if (!(sensorWidthMm > 0) && pixelSizeUm > 0 && widthPx > 0 && heightPx > 0) {
          sensorWidthMm = (widthPx * pixelSizeUm) / 1000;
          sensorHeightMm = (heightPx * pixelSizeUm) / 1000;
        }
        const camera = {
          id: `custom-${crypto.randomUUID()}`,
          name: name.trim(),
          sensorWidthMm,
          sensorHeightMm,
          pixelSizeUm,
          widthPx,
          heightPx,
          sensor,
          readNoiseE: noise ?? 0,
          custom: true as const,
        };
        if (
          !camera.name ||
          !(camera.sensorWidthMm > 0) ||
          !(camera.sensorHeightMm > 0) ||
          !(camera.pixelSizeUm > 0) ||
          !(camera.widthPx > 0) ||
          !(camera.heightPx > 0) ||
          !(camera.readNoiseE > 0)
        ) {
          setError("Every camera dimension needs a positive number.");
          return;
        }
        onSave(camera);
        setName("");
        setError("");
      }}
    >
      <label className="field">Name<input value={name} placeholder="e.g. My camera" onChange={(event) => setName(event.target.value)} /></label>
      <NumericField label="Sensor width (mm)" value={width} fallback={11.31} min={0.1} max={100} placeholder="e.g. 11.31" allowEmpty={false} onCommit={setWidth} />
      <NumericField label="Sensor height (mm)" value={height} fallback={11.31} min={0.1} max={100} placeholder="e.g. 11.31" allowEmpty={false} onCommit={setHeight} />
      <NumericField label="Pixel size (µm, optional if resolution is set)" value={pixel} fallback={3.76} min={0.1} max={50} placeholder="e.g. 3.76" allowEmpty onCommit={setPixel} />
      <NumericField label="Width (px)" value={cols} fallback={3008} min={1} max={30000} inputMode="numeric" placeholder="e.g. 3008" allowEmpty={false} onCommit={(next) => setCols(next == null ? null : Math.round(next))} />
      <NumericField label="Height (px)" value={rows} fallback={3008} min={1} max={30000} inputMode="numeric" placeholder="e.g. 3008" allowEmpty={false} onCommit={(next) => setRows(next == null ? null : Math.round(next))} />
      <label className="field">
        Sensor
        <select value={sensor} onChange={(event) => setSensor(event.target.value as SensorKind)}>
          <option value="colour">Colour</option>
          <option value="mono">Mono</option>
        </select>
      </label>
      <NumericField label="Read noise (e−, nominal)" value={noise} fallback={1.5} min={0.01} max={50} placeholder="e.g. 1.5" allowEmpty={false} onCommit={setNoise} />
      {error ? <p className="warn">{error}</p> : null}
      <button type="submit" className="vision">Save camera</button>
    </form>
  );
}

function FilterForm({ onSave }: { onSave: (filter: ImagingFilter) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<FilterKind>("ha");
  const [bandpass, setBandpass] = useState<number | null>(6);
  const [transmission, setTransmission] = useState<number | null>(0.9);
  const [error, setError] = useState("");
  return (
    <form
      className="fields"
      onSubmit={(event) => {
        event.preventDefault();
        const filter = {
          id: `custom-${crypto.randomUUID()}`,
          name: name.trim(),
          kind,
          bandpassNm: bandpass ?? 0,
          transmission: transmission ?? 0,
          custom: true as const,
        };
        if (!filter.name || !(filter.bandpassNm > 0) || !(filter.transmission > 0 && filter.transmission <= 1)) {
          setError("Bandpass must be positive and transmission must be between 0 and 1.");
          return;
        }
        onSave(filter);
        setName("");
        setError("");
      }}
    >
      <label className="field">Name<input value={name} placeholder="e.g. My H-alpha" onChange={(event) => setName(event.target.value)} /></label>
      <label className="field">
        Kind
        <select value={kind} onChange={(event) => setKind(event.target.value as FilterKind)}>
          {KINDS.map((item) => (
            <option key={item} value={item}>
              {filterKindLabel(item)}
            </option>
          ))}
        </select>
      </label>
      <NumericField label="Bandpass (nm)" value={bandpass} fallback={6} min={0.1} max={500} placeholder="e.g. 6" allowEmpty={false} onCommit={setBandpass} />
      <NumericField label="Peak transmission (0–1)" value={transmission} fallback={0.9} min={0.01} max={1} placeholder="e.g. 0.9" allowEmpty={false} onCommit={setTransmission} />
      {error ? <p className="warn">{error}</p> : null}
      <button type="submit" className="vision">Save filter</button>
    </form>
  );
}
