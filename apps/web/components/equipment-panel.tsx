"use client";

import { useMemo, useState, type ReactNode } from "react";
import { filterKindLabel, type Camera, type FilterKind, type ImagingFilter, type Telescope } from "@dss/core";
import { Combobox } from "./combobox";
import { usePlannerState } from "./planner-context";

type AddMode = "rig" | "scope" | "camera" | "filter" | null;

const REDUCERS = [
  { value: 1, label: "1.0× flattener or none" },
  { value: 0.8, label: "0.8× reducer" },
  { value: 0.75, label: "0.75× reducer" },
  { value: 0.63, label: "0.63× reducer" },
  { value: 2, label: "2× Barlow" },
];

const FILTER_KINDS: FilterKind[] = [
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

function reducerLabel(value: number): string {
  return REDUCERS.find((item) => item.value === value)?.label ?? `${value}×`;
}

function rankLibraryFirst<T extends { id: string; name: string }>(
  items: T[],
  libraryIds: readonly string[],
): T[] {
  const library = new Set(libraryIds);
  const inLibrary = items
    .filter((item) => library.has(item.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const rest = items
    .filter((item) => !library.has(item.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...inLibrary, ...rest];
}

export function EquipmentPanel() {
  const planner = usePlannerState();
  const [addMode, setAddMode] = useState<AddMode>(null);

  const libraryScopes = useMemo(
    () =>
      planner.libraryTelescopeIds
        .map((id) => planner.telescopes.find((item) => item.id === id))
        .filter((item): item is Telescope => Boolean(item)),
    [planner.libraryTelescopeIds, planner.telescopes],
  );

  const libraryCameras = useMemo(
    () =>
      planner.libraryCameraIds
        .map((id) => planner.cameraList.find((item) => item.id === id))
        .filter((item): item is Camera => Boolean(item)),
    [planner.libraryCameraIds, planner.cameraList],
  );

  const libraryFilters = useMemo(
    () =>
      planner.libraryFilterIds
        .map((id) => planner.filterList.find((item) => item.id === id))
        .filter((item): item is ImagingFilter => Boolean(item)),
    [planner.libraryFilterIds, planner.filterList],
  );

  return (
    <div className="equipment">
      <EquipmentSection title="Rigs" actionLabel="+ Add rig" onAction={() => setAddMode("rig")}>
        {planner.rigs.length === 0 ? (
          <p className="note">No rigs yet. Add a scope + camera combination.</p>
        ) : (
          planner.rigs.map((rig) => {
            const scope = planner.telescopes.find((item) => item.id === rig.telescopeId);
            const camera = planner.cameraList.find((item) => item.id === rig.cameraId);
            const filters = rig.filterIds
              .map((id) => planner.filterList.find((item) => item.id === id)?.name ?? id)
              .join(", ");
            const active = planner.activeRigId === rig.id;
            return (
              <EquipmentRow
                key={rig.id}
                title={rig.name}
                detail={[scope?.name ?? rig.telescopeId, camera?.name ?? rig.cameraId, reducerLabel(rig.reducer), filters || null]
                  .filter(Boolean)
                  .join(" · ")}
                badge={active ? "Active" : undefined}
                active={active}
                onSelect={() => planner.selectRig(rig.id)}
                onDelete={() => {
                  if (window.confirm(`Remove “${rig.name}”?`)) planner.deleteRig(rig.id);
                }}
              />
            );
          })
        )}
      </EquipmentSection>

      <EquipmentSection title="Scopes" actionLabel="+ Add scope" onAction={() => setAddMode("scope")}>
        {libraryScopes.length === 0 ? (
          <p className="note">No scopes in your library yet.</p>
        ) : (
          libraryScopes.map((scope) => {
            const preferred = planner.telescopeReducers[scope.id];
            return (
              <EquipmentRow
                key={scope.id}
                title={scope.name}
                detail={[
                  `${scope.apertureMm} mm · ${scope.focalLengthMm} mm`,
                  preferred ? reducerLabel(preferred) : null,
                  scope.custom ? "custom" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                onDelete={() => {
                  if (
                    window.confirm(`Remove “${scope.name}” from equipment and any rigs that use it?`)
                  ) {
                    planner.deleteTelescopeFromLibrary(scope.id);
                  }
                }}
              />
            );
          })
        )}
      </EquipmentSection>

      <EquipmentSection title="Cameras" actionLabel="+ Add camera" onAction={() => setAddMode("camera")}>
        {libraryCameras.length === 0 ? (
          <p className="note">No cameras in your library yet.</p>
        ) : (
          libraryCameras.map((camera) => (
            <EquipmentRow
              key={camera.id}
              title={camera.name}
              detail={`${camera.sensor} · ${camera.widthPx}×${camera.heightPx}${camera.custom ? " · custom" : ""}`}
              onDelete={() => {
                if (window.confirm(`Remove “${camera.name}” from equipment and any rigs that use it?`)) {
                  planner.deleteCameraFromLibrary(camera.id);
                }
              }}
            />
          ))
        )}
      </EquipmentSection>

      <EquipmentSection title="Filters" actionLabel="+ Add filter" onAction={() => setAddMode("filter")}>
        {libraryFilters.length === 0 ? (
          <p className="note">No filters in your library yet. Add from the catalogue, or pick filters in Tonight settings.</p>
        ) : (
          libraryFilters.map((filter) => (
            <EquipmentRow
              key={filter.id}
              title={filter.name}
              detail={`${filterKindLabel(filter.kind)} · ${filter.bandpassNm} nm${filter.custom ? " · custom" : ""}`}
              onDelete={() => {
                if (window.confirm(`Remove “${filter.name}” from equipment and any rigs that use it?`)) {
                  planner.deleteFilterFromLibrary(filter.id);
                }
              }}
            />
          ))
        )}
      </EquipmentSection>

      <div className="hub-card equipment-active is-active">
        <p className="setting-prefix">Tonight active gear</p>
        <strong>{planner.telescope?.name ?? "No scope selected"}</strong>
        <p className="note" style={{ margin: 0 }}>
          {planner.camera?.name ?? "No camera selected"}
        </p>
        <p className="note" style={{ margin: 0 }}>
          {reducerLabel(planner.reducer)}
        </p>
        <p className="note" style={{ margin: 0 }}>
          {planner.filterIds.length === 0
            ? "No filter"
            : planner.filterIds
                .map((id) => planner.filterList.find((item) => item.id === id)?.name ?? id)
                .join(", ")}
        </p>
      </div>

      {addMode ? <AddGearDialog mode={addMode} onClose={() => setAddMode(null)} /> : null}
    </div>
  );
}

function EquipmentSection({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
  children: ReactNode;
}) {
  return (
    <section className="equipment-section">
      <div className="equipment-section-head">
        <h2>{title}</h2>
        <button type="button" className="ghost" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
      <div className="hub-card equipment-list">{children}</div>
    </section>
  );
}

function EquipmentRow({
  title,
  detail,
  badge,
  active = false,
  onSelect,
  onDelete,
}: {
  title: string;
  detail: string;
  badge?: string;
  active?: boolean;
  onSelect?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`equipment-row${active ? " is-active" : ""}`}>
      {onSelect ? (
        <button type="button" className="equipment-row-main" onClick={onSelect}>
          <strong>
            {title}
            {badge ? <span className="hub-badge">{badge}</span> : null}
          </strong>
          <span>{detail}</span>
        </button>
      ) : (
        <div className="equipment-row-main">
          <strong>
            {title}
            {badge ? <span className="hub-badge">{badge}</span> : null}
          </strong>
          <span>{detail}</span>
        </div>
      )}
      <button type="button" className="ghost equipment-delete" onClick={onDelete} aria-label={`Delete ${title}`}>
        Delete
      </button>
    </div>
  );
}

function AddGearDialog({ mode, onClose }: { mode: Exclude<AddMode, null>; onClose: () => void }) {
  const planner = usePlannerState();
  const [name, setName] = useState("");
  const [telescopeId, setTelescopeId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [filterId, setFilterId] = useState("");
  const [reducer, setReducer] = useState(1);
  const [aperture, setAperture] = useState("");
  const [focal, setFocal] = useState("");
  const [pixel, setPixel] = useState("");
  const [widthPx, setWidthPx] = useState("");
  const [heightPx, setHeightPx] = useState("");
  const [sensorW, setSensorW] = useState("");
  const [sensorH, setSensorH] = useState("");
  const [filterKind, setFilterKind] = useState<FilterKind>("ha");
  const [bandpass, setBandpass] = useState("7");
  const [transmission, setTransmission] = useState("0.9");
  const [error, setError] = useState<string | null>(null);

  const selectedScope = planner.telescopes.find((item) => item.id === telescopeId) ?? null;
  const smartCameraIds = useMemo(
    () => new Set(planner.telescopes.flatMap((item) => (item.smart ? [item.smart.cameraId] : []))),
    [planner.telescopes],
  );

  const scopeOptions = useMemo(
    () =>
      rankLibraryFirst(planner.telescopes, planner.libraryTelescopeIds).map((item) => ({
        id: item.id,
        label: item.name,
        hint: item.smart
          ? `Library · Smart · ${item.apertureMm} mm`
          : planner.libraryTelescopeIds.includes(item.id)
            ? `Library · ${item.apertureMm} mm · ${item.focalLengthMm} mm`
            : `${item.apertureMm} mm · ${item.focalLengthMm} mm`,
      })),
    [planner.telescopes, planner.libraryTelescopeIds],
  );

  const cameraOptions = useMemo(
    () =>
      rankLibraryFirst(
        planner.cameraList.filter((item) => item.custom || !smartCameraIds.has(item.id)),
        planner.libraryCameraIds,
      ).map((item) => ({
        id: item.id,
        label: item.name,
        hint: planner.libraryCameraIds.includes(item.id)
          ? `Library · ${item.sensor} · ${item.widthPx}×${item.heightPx}`
          : `${item.sensor} · ${item.widthPx}×${item.heightPx}`,
      })),
    [planner.cameraList, planner.libraryCameraIds, smartCameraIds],
  );

  const filterOptions = useMemo(() => {
    const base = selectedScope?.smart?.filterIds?.length
      ? planner.filterList.filter((item) => selectedScope.smart?.filterIds.includes(item.id))
      : planner.filterList;
    return rankLibraryFirst(base, planner.libraryFilterIds).map((item) => ({
      id: item.id,
      label: item.name,
      hint: planner.libraryFilterIds.includes(item.id)
        ? `Library · ${filterKindLabel(item.kind)} · ${item.bandpassNm} nm`
        : `${filterKindLabel(item.kind)} · ${item.bandpassNm} nm`,
    }));
  }, [planner.filterList, planner.libraryFilterIds, selectedScope]);

  const flattenerOptions = useMemo(() => {
    const preferred = telescopeId ? planner.telescopeReducers[telescopeId] : undefined;
    const ordered = preferred
      ? [...REDUCERS].sort((a, b) => (a.value === preferred ? -1 : b.value === preferred ? 1 : 0))
      : REDUCERS;
    return ordered.map((item) => ({
      id: String(item.value),
      label: item.label,
      hint: preferred === item.value ? "Preferred for this scope" : undefined,
    }));
  }, [planner.telescopeReducers, telescopeId]);

  const title =
    mode === "rig" ? "Add rig" : mode === "scope" ? "Add scope" : mode === "camera" ? "Add camera" : "Add filter";

  function pickScope(id: string) {
    const scope = planner.telescopes.find((item) => item.id === id);
    setTelescopeId(id);
    setName("");
    if (scope?.smart) {
      setCameraId(scope.smart.cameraId);
      setFilterId(scope.smart.filterIds[0] ?? "");
      setReducer(1);
    } else {
      setReducer(planner.telescopeReducers[id] ?? 1);
    }
  }

  function submit() {
    setError(null);
    if (mode === "rig") {
      if (!telescopeId || (!selectedScope?.smart && !cameraId)) {
        setError("Pick a scope and camera.");
        return;
      }
      const rig = planner.createRig({
        name,
        telescopeId,
        cameraId: selectedScope?.smart ? selectedScope.smart.cameraId : cameraId,
        reducer,
        filterIds: filterId ? [filterId] : [],
      });
      if (!rig) {
        setError("Could not create that rig.");
        return;
      }
      planner.selectRig(rig.id);
      onClose();
      return;
    }
    if (mode === "scope") {
      if (selectedScope) {
        planner.addTelescopeToLibrary(selectedScope.id, selectedScope.smart ? undefined : reducer);
        onClose();
        return;
      }
      const apertureMm = Number(aperture);
      const focalLengthMm = Number(focal);
      if (!name.trim() || !(apertureMm > 0) || !(focalLengthMm > 0)) {
        setError("Pick a catalogue scope, or enter a name, aperture, and focal length.");
        return;
      }
      planner.addCustomTelescope({ name, apertureMm, focalLengthMm, preferredReducer: reducer });
      onClose();
      return;
    }
    if (mode === "camera") {
      if (cameraId) {
        planner.addCameraToLibrary(cameraId);
        onClose();
        return;
      }
      const pixelSizeUm = Number(pixel);
      const width = Number(widthPx);
      const height = Number(heightPx);
      const sensorWidthMm = Number(sensorW);
      const sensorHeightMm = Number(sensorH);
      if (
        !name.trim() ||
        !(pixelSizeUm > 0) ||
        !(width > 0) ||
        !(height > 0) ||
        !(sensorWidthMm > 0) ||
        !(sensorHeightMm > 0)
      ) {
        setError("Pick a catalogue camera, or fill in name and sensor numbers.");
        return;
      }
      planner.addCustomCamera({
        name,
        pixelSizeUm,
        widthPx: Math.round(width),
        heightPx: Math.round(height),
        sensorWidthMm,
        sensorHeightMm,
        sensor: "colour",
        readNoiseE: 1.5,
      });
      onClose();
      return;
    }
    if (filterId) {
      planner.addFilterToLibrary(filterId);
      onClose();
      return;
    }
    const bandpassNm = Number(bandpass);
    const transmissionValue = Number(transmission);
    if (!name.trim() || !(bandpassNm > 0) || !(transmissionValue > 0) || transmissionValue > 1) {
      setError("Pick a catalogue filter, or fill in name, bandpass, and transmission.");
      return;
    }
    planner.addCustomFilter({
      name,
      kind: filterKind,
      bandpassNm,
      transmission: transmissionValue,
    });
    onClose();
  }

  return (
    <div className="equipment-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="equipment-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="equipment-dialog-head">
          <h2>{title}</h2>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="equipment-dialog-body">
          {mode === "rig" ? (
            <>
              <label className="field">
                Rig name
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Widefield dual" />
              </label>
              <Combobox
                label="Scope"
                value={telescopeId}
                options={scopeOptions}
                preserveOrder
                placeholder="Type to filter — library scopes listed first"
                onChange={pickScope}
              />
              {selectedScope && !selectedScope.smart ? (
                <Combobox
                  label="Flattener / reducer"
                  value={String(reducer)}
                  options={flattenerOptions}
                  preserveOrder
                  placeholder="Choose flattener"
                  onChange={(id) => setReducer(Number(id))}
                />
              ) : selectedScope?.smart ? (
                <p className="note">Smart scopes use built-in optics (no separate flattener).</p>
              ) : null}
              {!selectedScope?.smart ? (
                <Combobox
                  label="Camera"
                  value={cameraId}
                  options={cameraOptions}
                  preserveOrder
                  placeholder="Type to filter — library cameras listed first"
                  onChange={setCameraId}
                />
              ) : (
                <p className="note">Camera is paired with this smart scope.</p>
              )}
              <Combobox
                label="Filter (optional)"
                value={filterId}
                options={filterOptions}
                preserveOrder
                placeholder="Type to filter — library filters listed first"
                onChange={setFilterId}
              />
              {filterId ? (
                <button type="button" className="ghost" onClick={() => setFilterId("")}>
                  Clear filter
                </button>
              ) : null}
            </>
          ) : null}

          {mode === "scope" ? (
            <>
              <Combobox
                label="Scope"
                value={telescopeId}
                options={scopeOptions}
                preserveOrder
                placeholder="Type to filter the full catalogue — library first"
                onChange={pickScope}
              />
              {selectedScope && !selectedScope.smart ? (
                <Combobox
                  label="Preferred flattener"
                  value={String(reducer)}
                  options={flattenerOptions}
                  preserveOrder
                  onChange={(id) => setReducer(Number(id))}
                />
              ) : null}
              {!selectedScope ? (
                <>
                  <p className="note">Or create custom</p>
                  <label className="field">
                    Name
                    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="My 80mm" />
                  </label>
                  <label className="field">
                    Aperture (mm)
                    <input value={aperture} onChange={(event) => setAperture(event.target.value)} inputMode="decimal" />
                  </label>
                  <label className="field">
                    Focal length (mm)
                    <input value={focal} onChange={(event) => setFocal(event.target.value)} inputMode="decimal" />
                  </label>
                  <Combobox
                    label="Preferred flattener"
                    value={String(reducer)}
                    options={flattenerOptions}
                    preserveOrder
                    onChange={(id) => setReducer(Number(id))}
                  />
                </>
              ) : null}
            </>
          ) : null}

          {mode === "camera" ? (
            <>
              <Combobox
                label="Camera"
                value={cameraId}
                options={cameraOptions}
                preserveOrder
                placeholder="Type to filter — library cameras listed first"
                onChange={(id) => {
                  setCameraId(id);
                  setName("");
                }}
              />
              {!cameraId ? (
                <>
                  <p className="note">Or create custom</p>
                  <label className="field">
                    Name
                    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="My camera" />
                  </label>
                  <label className="field">
                    Pixel size (µm)
                    <input value={pixel} onChange={(event) => setPixel(event.target.value)} inputMode="decimal" />
                  </label>
                  <label className="field">
                    Width (px)
                    <input value={widthPx} onChange={(event) => setWidthPx(event.target.value)} inputMode="numeric" />
                  </label>
                  <label className="field">
                    Height (px)
                    <input value={heightPx} onChange={(event) => setHeightPx(event.target.value)} inputMode="numeric" />
                  </label>
                  <label className="field">
                    Sensor width (mm)
                    <input value={sensorW} onChange={(event) => setSensorW(event.target.value)} inputMode="decimal" />
                  </label>
                  <label className="field">
                    Sensor height (mm)
                    <input value={sensorH} onChange={(event) => setSensorH(event.target.value)} inputMode="decimal" />
                  </label>
                </>
              ) : null}
            </>
          ) : null}

          {mode === "filter" ? (
            <>
              <Combobox
                label="Filter"
                value={filterId}
                options={filterOptions}
                preserveOrder
                placeholder="Type to filter the full catalogue — library first"
                onChange={(id) => {
                  setFilterId(id);
                  setName("");
                }}
              />
              {!filterId ? (
                <>
                  <p className="note">Or create custom</p>
                  <label className="field">
                    Name
                    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="My Ha 7nm" />
                  </label>
                  <label className="field">
                    Kind
                    <select value={filterKind} onChange={(event) => setFilterKind(event.target.value as FilterKind)}>
                      {FILTER_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {filterKindLabel(kind)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Bandpass (nm)
                    <input value={bandpass} onChange={(event) => setBandpass(event.target.value)} inputMode="decimal" />
                  </label>
                  <label className="field">
                    Transmission (0–1)
                    <input
                      value={transmission}
                      onChange={(event) => setTransmission(event.target.value)}
                      inputMode="decimal"
                    />
                  </label>
                </>
              ) : null}
            </>
          ) : null}

          {error ? <p className="warn">{error}</p> : null}
        </div>

        <footer className="equipment-dialog-foot">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={submit}>
            {mode === "rig"
              ? "Save rig"
              : mode === "scope"
                ? selectedScope
                  ? "Add scope"
                  : "Save custom scope"
                : mode === "camera"
                  ? cameraId
                    ? "Add camera"
                    : "Save custom camera"
                  : filterId
                    ? "Add filter"
                    : "Save custom filter"}
          </button>
        </footer>
      </div>
    </div>
  );
}
