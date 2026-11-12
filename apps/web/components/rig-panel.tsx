"use client";

import { useState } from "react";
import {
  filterKindLabel,
  samplingSummary,
  type Camera,
  type FilterKind,
  type ImagingFilter,
  type SensorKind,
  type Telescope,
} from "@dss/core";
import { usePlannerState } from "./planner-context";
import { Section } from "./section";

const MULTIPLIERS = [0.63, 0.8, 1, 2];
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

export function RigPanel() {
  const planner = usePlannerState();
  const { telescope, camera, optics } = planner;

  return (
    <Section index="07" title="Rig">
      {optics && telescope && camera ? (
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
        <label className="field">
          Telescope
          <select value={telescope?.id ?? ""} onChange={(event) => planner.setTelescopeId(event.target.value)}>
            {planner.telescopes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.custom ? " (custom)" : ""}
              </option>
            ))}
          </select>
        </label>
        {telescope ? (
          <p className="note">
            {telescope.apertureMm} mm aperture, {telescope.focalLengthMm} mm native focal length.
          </p>
        ) : null}
        <div className="field">
          Focal multiplier
          <div className="chips">
            {MULTIPLIERS.map((value) => (
              <button
                key={value}
                type="button"
                className="chip"
                aria-pressed={planner.reducer === value}
                onClick={() => planner.setReducer(value)}
              >
                {value === 1 ? "None" : `${value}×`}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={0.25}
            max={5}
            step={0.05}
            value={planner.reducer}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (value >= 0.25 && value <= 5) planner.setReducer(value);
            }}
          />
        </div>
        <label className="field">
          Camera
          <select value={camera?.id ?? ""} onChange={(event) => planner.setCameraId(event.target.value)}>
            {planner.cameraList.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.custom ? " (custom)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          Filters in the plan
          <div className="checks">
            {planner.filterList.map((filter) => (
              <label key={filter.id} className="check">
                <input
                  type="checkbox"
                  checked={planner.filterIds.includes(filter.id)}
                  onChange={() => planner.toggleFilter(filter.id)}
                />
                <span>
                  {filter.name}
                  <small style={{ color: "var(--faint)" }}> · {filterKindLabel(filter.kind)}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <CustomGear />
    </Section>
  );
}

function CustomGear() {
  const planner = usePlannerState();
  return (
    <>
      <details className="drawer">
        <summary>Custom telescope</summary>
        <ScopeForm
          onSave={(scope) => {
            planner.addTelescope(scope);
          }}
        />
      </details>
      <details className="drawer">
        <summary>Custom camera</summary>
        <CameraForm onSave={(camera) => planner.addCamera(camera)} />
      </details>
      <details className="drawer">
        <summary>Custom filter</summary>
        <FilterForm onSave={(filter) => planner.addFilter(filter)} />
      </details>
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
  const [aperture, setAperture] = useState("80");
  const [focal, setFocal] = useState("480");
  const [error, setError] = useState("");
  return (
    <form
      className="fields"
      onSubmit={(event) => {
        event.preventDefault();
        const apertureMm = Number(aperture);
        const focalLengthMm = Number(focal);
        if (!name.trim() || !(apertureMm > 0) || !(focalLengthMm > 0)) {
          setError("Name, aperture, and focal length need positive values.");
          return;
        }
        onSave({ id: `custom-${crypto.randomUUID()}`, name: name.trim(), apertureMm, focalLengthMm, custom: true });
        setName("");
        setError("");
      }}
    >
      <label className="field">Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="field">Aperture (mm)<input value={aperture} onChange={(event) => setAperture(event.target.value)} inputMode="decimal" /></label>
      <label className="field">Focal length (mm)<input value={focal} onChange={(event) => setFocal(event.target.value)} inputMode="decimal" /></label>
      {error ? <p className="warn">{error}</p> : null}
      <button type="submit" className="vision">Save telescope</button>
    </form>
  );
}

function CameraForm({ onSave }: { onSave: (camera: Camera) => void }) {
  const [name, setName] = useState("");
  const [width, setWidth] = useState("11.31");
  const [height, setHeight] = useState("11.31");
  const [pixel, setPixel] = useState("3.76");
  const [cols, setCols] = useState("3008");
  const [rows, setRows] = useState("3008");
  const [sensor, setSensor] = useState<SensorKind>("colour");
  const [noise, setNoise] = useState("1.5");
  const [error, setError] = useState("");
  return (
    <form
      className="fields"
      onSubmit={(event) => {
        event.preventDefault();
        const camera = {
          id: `custom-${crypto.randomUUID()}`,
          name: name.trim(),
          sensorWidthMm: Number(width),
          sensorHeightMm: Number(height),
          pixelSizeUm: Number(pixel),
          widthPx: Number(cols),
          heightPx: Number(rows),
          sensor,
          readNoiseE: Number(noise),
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
      <label className="field">Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="field">Sensor width (mm)<input value={width} onChange={(event) => setWidth(event.target.value)} inputMode="decimal" /></label>
      <label className="field">Sensor height (mm)<input value={height} onChange={(event) => setHeight(event.target.value)} inputMode="decimal" /></label>
      <label className="field">Pixel size (µm)<input value={pixel} onChange={(event) => setPixel(event.target.value)} inputMode="decimal" /></label>
      <label className="field">Width (px)<input value={cols} onChange={(event) => setCols(event.target.value)} inputMode="numeric" /></label>
      <label className="field">Height (px)<input value={rows} onChange={(event) => setRows(event.target.value)} inputMode="numeric" /></label>
      <label className="field">
        Sensor
        <select value={sensor} onChange={(event) => setSensor(event.target.value as SensorKind)}>
          <option value="colour">Colour</option>
          <option value="mono">Mono</option>
        </select>
      </label>
      <label className="field">Read noise (e−, nominal)<input value={noise} onChange={(event) => setNoise(event.target.value)} inputMode="decimal" /></label>
      {error ? <p className="warn">{error}</p> : null}
      <button type="submit" className="vision">Save camera</button>
    </form>
  );
}

function FilterForm({ onSave }: { onSave: (filter: ImagingFilter) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<FilterKind>("ha");
  const [bandpass, setBandpass] = useState("6");
  const [transmission, setTransmission] = useState("0.9");
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
          bandpassNm: Number(bandpass),
          transmission: Number(transmission),
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
      <label className="field">Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
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
      <label className="field">Bandpass (nm)<input value={bandpass} onChange={(event) => setBandpass(event.target.value)} inputMode="decimal" /></label>
      <label className="field">Peak transmission (0–1)<input value={transmission} onChange={(event) => setTransmission(event.target.value)} inputMode="decimal" /></label>
      {error ? <p className="warn">{error}</p> : null}
      <button type="submit" className="vision">Save filter</button>
    </form>
  );
}
