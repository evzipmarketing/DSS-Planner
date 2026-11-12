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
import { Combobox } from "./combobox";
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

export function RigPanel() {
  const planner = usePlannerState();
  const { telescope, camera, optics } = planner;

  return (
    <Section index="05" title="Rig">
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
        <Combobox
          label="Telescope"
          value={telescope?.id ?? ""}
          placeholder="Search scopes"
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
            value={REDUCERS.some((item) => item.value === planner.reducer) ? String(planner.reducer) : "custom"}
            onChange={(event) => {
              if (event.target.value !== "custom") planner.setReducer(Number(event.target.value));
              else planner.setReducer(planner.reducer);
            }}
          >
            {REDUCERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
            <option value="custom">Custom factor</option>
          </select>
        </label>
        <label className="field">
          Factor
          <input
            type="number"
            min={0.25}
            max={5}
            step={0.01}
            value={planner.reducer}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (value >= 0.25 && value <= 5) planner.setReducer(value);
            }}
          />
        </label>
        <Combobox
          label="Camera"
          value={camera?.id ?? ""}
          placeholder="Search cameras"
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
          placeholder="Search filters"
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
          {planner.filterList
            .filter((item) => planner.filterIds.includes(item.id))
            .map((item) => (
              <button key={item.id} type="button" className="chip" onClick={() => planner.toggleFilter(item.id)}>
                {item.name} · {filterKindLabel(item.kind)} ×
              </button>
            ))}
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
        const widthPx = Number(cols);
        const heightPx = Number(rows);
        let sensorWidthMm = Number(width);
        let sensorHeightMm = Number(height);
        let pixelSizeUm = Number(pixel);
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
      <label className="field">Pixel size (µm, optional if resolution is set)<input value={pixel} onChange={(event) => setPixel(event.target.value)} inputMode="decimal" /></label>
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
