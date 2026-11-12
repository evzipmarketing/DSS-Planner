"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  effectiveFocalLengthMm,
  fieldOfView,
  focalRatio,
  pixelScaleArcsec,
  rankTargets,
  samplingAdvice,
  searchCatalogue,
  sensorDisagreement,
  suggestExposure,
  buildNightTrack,
  type Camera,
  type DeepSkyObject,
  type ExposureSuggestion,
  type ImagingFilter,
  type NightTrack,
  type RankedTarget,
  type SamplingAdvice,
  type Site,
  type Telescope,
  type FieldOfView,
} from "@dss/core";
import {
  cameras as seedCameras,
  defaultCameraId,
  defaultFilterId,
  defaultSite,
  defaultTelescopeId,
  filters as seedFilters,
  telescopes as seedTelescopes,
} from "@dss/data";
import { loadSession, resolveSite, saveSession, type Vision } from "./storage";

export type Pointing = {
  raDeg: number;
  decDeg: number;
  rotationDeg: number;
};

export type Optics = {
  focalLengthMm: number;
  focalRatio: number;
  field: FieldOfView;
  pixelScale: number;
  sampling: SamplingAdvice;
  imageFovDeg: number;
  disagreement: ReturnType<typeof sensorDisagreement>;
};

export function usePlanner() {
  const [catalogue, setCatalogue] = useState<DeepSkyObject[] | null>(null);
  const [vision, setVision] = useState<Vision>("ink");
  const [site, setSite] = useState<Site>(defaultSite);
  const [date, setDate] = useState(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: defaultSite.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  });
  const [bortle, setBortle] = useState(7);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pointing, setPointing] = useState<Pointing | null>(null);
  const [telescopeId, setTelescopeId] = useState(defaultTelescopeId);
  const [reducer, setReducer] = useState(1);
  const [cameraId, setCameraId] = useState(defaultCameraId);
  const [filterIds, setFilterIds] = useState<string[]>([defaultFilterId]);
  const [customTelescopes, setCustomTelescopes] = useState<Telescope[]>([]);
  const [customCameras, setCustomCameras] = useState<Camera[]>([]);
  const [customFilters, setCustomFilters] = useState<ImagingFilter[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [ranked, setRanked] = useState<{ key: string; items: RankedTarget[] } | null>(null);
  const [pointingFor, setPointingFor] = useState<string | null>(null);

  useEffect(() => {
    // localStorage is empty during SSR, so the stored session is applied after mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    const stored = loadSession();
    if (stored) {
      setVision(stored.vision);
      setSite(resolveSite(stored));
      setBortle(stored.bortle);
      if (stored.telescopeId) setTelescopeId(stored.telescopeId);
      setReducer(stored.reducer);
      if (stored.cameraId) setCameraId(stored.cameraId);
      if (stored.filterIds.length > 0) setFilterIds(stored.filterIds);
      setCustomTelescopes(stored.customTelescopes);
      setCustomCameras(stored.customCameras);
      setCustomFilters(stored.customFilters);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    let cancelled = false;
    void import("@dss/data/catalogue").then((module) => {
      if (!cancelled) setCatalogue(module.deepSkyCatalogue);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSession({
      version: 1,
      vision,
      locationId: site.id,
      customSite: site.id === "custom" ? site : undefined,
      bortle,
      telescopeId,
      reducer,
      cameraId,
      filterIds,
      customTelescopes,
      customCameras,
      customFilters,
    });
  }, [
    hydrated,
    vision,
    site,
    bortle,
    telescopeId,
    reducer,
    cameraId,
    filterIds,
    customTelescopes,
    customCameras,
    customFilters,
  ]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!hydrated && root.dataset.vision === "red" && vision === "ink") return;
    root.dataset.vision = vision;
  }, [vision, hydrated]);

  const telescopes = useMemo(() => [...seedTelescopes, ...customTelescopes], [customTelescopes]);
  const cameraList = useMemo(() => [...seedCameras, ...customCameras], [customCameras]);
  const filterList = useMemo(() => [...seedFilters, ...customFilters], [customFilters]);
  const telescope = telescopes.find((item) => item.id === telescopeId) ?? telescopes[0] ?? null;
  const camera = cameraList.find((item) => item.id === cameraId) ?? cameraList[0] ?? null;
  const activeFilters = filterList.filter((item) => filterIds.includes(item.id));

  const optics = useMemo<Optics | null>(() => {
    if (!telescope || !camera) return null;
    const focalLengthMm = effectiveFocalLengthMm(telescope, reducer);
    const field = fieldOfView(camera, focalLengthMm);
    const longest = Math.max(field.widthDeg, field.heightDeg);
    return {
      focalLengthMm,
      focalRatio: focalRatio(telescope.apertureMm, focalLengthMm),
      field,
      pixelScale: pixelScaleArcsec(camera.pixelSizeUm, focalLengthMm),
      sampling: samplingAdvice(pixelScaleArcsec(camera.pixelSizeUm, focalLengthMm), bortle),
      imageFovDeg: Math.min(20, Math.max(0.08, longest * 1.45)),
      disagreement: sensorDisagreement(camera),
    };
  }, [telescope, camera, reducer, bortle]);

  const exposures = useMemo<ExposureSuggestion[]>(() => {
    if (!telescope || !camera || !optics) return [];
    return activeFilters.map((filter) =>
      suggestExposure({
        filter,
        bortle,
        apertureMm: telescope.apertureMm,
        focalLengthMm: optics.focalLengthMm,
        pixelScaleArcsec: optics.pixelScale,
        readNoiseE: camera.readNoiseE,
      }),
    );
  }, [activeFilters, telescope, camera, optics, bortle]);

  const shortlistKey = `${site.latitude}|${site.longitude}|${site.timezone}|${date}`;
  const shortlist = useMemo(
    () => (ranked?.key === shortlistKey ? ranked.items : []),
    [ranked, shortlistKey],
  );
  const scoring = Boolean(hydrated && catalogue && ranked?.key !== shortlistKey);

  useEffect(() => {
    if (!hydrated || !catalogue) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setRanked({ key: shortlistKey, items: rankTargets(catalogue, site, date) });
    }, 16);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hydrated, catalogue, site, date, shortlistKey]);

  const selected = useMemo(() => {
    const chosen = catalogue?.find((object) => object.id === selectedId);
    return chosen ?? shortlist[0]?.object ?? null;
  }, [catalogue, selectedId, shortlist]);

  if (selected && pointingFor !== selected.id) {
    setPointingFor(selected.id);
    setPointing({ raDeg: selected.raDeg, decDeg: selected.decDeg, rotationDeg: 0 });
  }

  const track = useMemo<NightTrack | null>(() => {
    if (!selected) return null;
    return buildNightTrack({
      raDeg: selected.raDeg,
      decDeg: selected.decDeg,
      site,
      dateIso: date,
      stepMinutes: 10,
    });
  }, [selected, site, date]);

  const results = useMemo(() => {
    if (!catalogue || query.trim().length < 1) return [];
    return searchCatalogue(catalogue, query, 18);
  }, [catalogue, query]);

  function chooseTarget(id: string) {
    setSelectedId(id);
  }

  function toggleFilter(id: string) {
    setFilterIds((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== id);
      }
      return [...current, id];
    });
  }

  function addTelescope(scope: Telescope) {
    setCustomTelescopes((current) => [...current, { ...scope, custom: true }]);
    setTelescopeId(scope.id);
  }

  function addCamera(next: Camera) {
    setCustomCameras((current) => [...current, { ...next, custom: true }]);
    setCameraId(next.id);
  }

  function addFilter(filter: ImagingFilter) {
    setCustomFilters((current) => [...current, { ...filter, custom: true }]);
    setFilterIds((current) => [...current, filter.id]);
  }

  function removeCustom(kind: "telescope" | "camera" | "filter", id: string) {
    if (kind === "telescope") {
      setCustomTelescopes((current) => current.filter((item) => item.id !== id));
      if (telescopeId === id) setTelescopeId(defaultTelescopeId);
    } else if (kind === "camera") {
      setCustomCameras((current) => current.filter((item) => item.id !== id));
      if (cameraId === id) setCameraId(defaultCameraId);
    } else {
      setCustomFilters((current) => current.filter((item) => item.id !== id));
      setFilterIds((current) => {
        const next = current.filter((item) => item !== id);
        return next.length > 0 ? next : [defaultFilterId];
      });
    }
  }

  return {
    catalogue,
    vision,
    setVision,
    site,
    setSite,
    date,
    setDate,
    bortle,
    setBortle,
    query,
    setQuery,
    results,
    shortlist,
    scoring,
    selected,
    chooseTarget,
    pointing,
    setPointing,
    track,
    telescopes,
    cameraList,
    filterList,
    telescope,
    camera,
    setTelescopeId,
    reducer,
    setReducer,
    setCameraId,
    filterIds,
    toggleFilter,
    optics,
    exposures,
    addTelescope,
    addCamera,
    addFilter,
    removeCustom,
  };
}

export type Planner = ReturnType<typeof usePlanner>;
