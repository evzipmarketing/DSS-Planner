"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  effectiveFocalLengthMm,
  fieldOfView,
  focalRatio,
  pixelScaleArcsec,
  rankTargets,
  samplingAdvice,
  searchCatalogue,
  sensorDisagreement,
  buildNightTrack,
  EMPTY_TARGET_QUERY,
  type Camera,
  type DeepSkyObject,
  type ImagingFilter,
  type NightTrack,
  type RankedTarget,
  type SamplingAdvice,
  type Site,
  type TargetListFilter,
  type TargetQuery,
  type Telescope,
  type FieldOfView,
} from "@dss/core";
import {
  cameras as seedCameras,
  defaultCameraId,
  defaultFilterId,
  defaultSite,
  defaultTelescopeId,
  estimateBortle,
  filters as seedFilters,
  telescopes as seedTelescopes,
} from "@dss/data";
import { loadSession, resolveSite, saveSession, type ThemeName } from "./storage";

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

export type PlaceStatus = "detecting" | "gps" | "saved" | "default";
export type BortleMode = "estimate" | "manual";

type PlaceBody = { name?: string; latitude?: number; longitude?: number; timezone?: string };

export function usePlanner() {
  const [coreCatalogue, setCoreCatalogue] = useState<DeepSkyObject[] | null>(null);
  const [extendedCatalogue, setExtendedCatalogue] = useState<DeepSkyObject[] | null>(null);
  const [targetQuery, setTargetQuery] = useState<TargetQuery>(EMPTY_TARGET_QUERY);
  const [listFilter, setListFilter] = useState<TargetListFilter>("all");
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [site, setSite] = useState<Site>(defaultSite);
  const [placeStatus, setPlaceStatus] = useState<PlaceStatus>("detecting");
  const [date, setDate] = useState(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: defaultSite.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  });
  const [bortleMode, setBortleMode] = useState<BortleMode>("estimate");
  const [bortle, setBortle] = useState(() => estimateBortle(defaultSite.latitude, defaultSite.longitude));
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
  const bortleModeRef = useRef(bortleMode);
  const hadStoredSite = useRef(false);

  useEffect(() => {
    bortleModeRef.current = bortleMode;
  }, [bortleMode]);

  useEffect(() => {
    // localStorage is only available after mount, so the stored session is applied here.
    /* eslint-disable react-hooks/set-state-in-effect */
    const stored = loadSession();
    if (stored) {
      const restored = resolveSite(stored);
      hadStoredSite.current = true;
      setTheme(stored.theme);
      setSite(restored);
      setBortleMode(stored.bortleMode);
      setBortle(stored.bortleMode === "estimate" ? estimateBortle(restored.latitude, restored.longitude) : stored.bortle);
      setPlaceStatus("saved");
      if (stored.telescopeId) setTelescopeId(stored.telescopeId);
      setReducer(stored.reducer);
      if (stored.cameraId) setCameraId(stored.cameraId);
      if (stored.filterIds.length > 0) setFilterIds(stored.filterIds);
      setCustomTelescopes(stored.customTelescopes);
      setCustomCameras(stored.customCameras);
      setCustomFilters(stored.customFilters);
    } else {
      setPlaceStatus("detecting");
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated || !navigator.geolocation) {
      if (hydrated) setPlaceStatus(hadStoredSite.current ? "saved" : "default");
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        void fetch(`/api/place?lat=${latitude}&lon=${longitude}`)
          .then(async (response) => {
            if (!response.ok) throw new Error("place");
            return (await response.json()) as PlaceBody;
          })
          .then((place) => {
            if (cancelled) return;
            const next: Site = {
              id: "custom",
              name: place.name || "Current location",
              latitude: place.latitude ?? latitude,
              longitude: place.longitude ?? longitude,
              timezone: place.timezone || "UTC",
            };
            setSite(next);
            if (bortleModeRef.current === "estimate") setBortle(estimateBortle(next.latitude, next.longitude));
            setPlaceStatus("gps");
          })
          .catch(() => {
            if (!cancelled) setPlaceStatus(hadStoredSite.current ? "saved" : "default");
          });
      },
      () => {
        if (!cancelled) setPlaceStatus(hadStoredSite.current ? "saved" : "default");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    let cancelled = false;
    void import("@dss/data/catalogue").then((module) => {
      if (!cancelled) setCoreCatalogue(module.deepSkyCore);
    });
    void import("@dss/data/catalogue-extended").then((module) => {
      if (!cancelled) setExtendedCatalogue(module.deepSkyExtended);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSession({
      version: 3,
      theme,
      locationId: site.id,
      customSite: site.id === "custom" ? site : undefined,
      bortle,
      bortleMode,
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
    theme,
    site,
    bortle,
    bortleMode,
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
    if (!hydrated && root.dataset.theme && root.dataset.theme !== theme) return;
    root.dataset.theme = theme;
    delete root.dataset.vision;
  }, [theme, hydrated]);

  const telescopes = useMemo(() => [...seedTelescopes, ...customTelescopes], [customTelescopes]);
  const cameraList = useMemo(() => [...seedCameras, ...customCameras], [customCameras]);
  const filterList = useMemo(() => [...seedFilters, ...customFilters], [customFilters]);
  const telescope = telescopes.find((item) => item.id === telescopeId) ?? telescopes[0] ?? null;
  const camera = cameraList.find((item) => item.id === cameraId) ?? cameraList[0] ?? null;
  const bortleEstimate = estimateBortle(site.latitude, site.longitude);

  const optics = useMemo<Optics | null>(() => {
    if (!telescope || !camera) return null;
    const focalLengthMm = effectiveFocalLengthMm(telescope, reducer);
    const field = fieldOfView(camera, focalLengthMm);
    const longest = Math.max(field.widthDeg, field.heightDeg);
    const scale = pixelScaleArcsec(camera.pixelSizeUm, focalLengthMm);
    return {
      focalLengthMm,
      focalRatio: focalRatio(telescope.apertureMm, focalLengthMm),
      field,
      pixelScale: scale,
      sampling: samplingAdvice(scale, bortle),
      imageFovDeg: Math.min(20, Math.max(0.08, longest * 1.45)),
      disagreement: sensorDisagreement(camera),
    };
  }, [telescope, camera, reducer, bortle]);

  const catalogue = useMemo(() => {
    if (!coreCatalogue) return null;
    return extendedCatalogue ? [...coreCatalogue, ...extendedCatalogue] : coreCatalogue;
  }, [coreCatalogue, extendedCatalogue]);

  const field = useMemo(
    () => (optics ? { widthArcmin: optics.field.widthArcmin, heightArcmin: optics.field.heightArcmin } : null),
    [optics],
  );
  const shortlistKey = `${site.latitude}|${site.longitude}|${site.timezone}|${date}|${targetQuery.types.join(",")}|${targetQuery.catalogues.join(",")}|${targetQuery.maxMagnitude ?? ""}|${targetQuery.minSizeArcmin ?? ""}|${field ? `${field.widthArcmin.toFixed(2)}x${field.heightArcmin.toFixed(2)}` : "none"}|${listFilter}|${bortle}|${extendedCatalogue ? "extended" : "core"}`;
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
      setRanked({
        key: shortlistKey,
        items: rankTargets(catalogue, site, date, 100, targetQuery, field, listFilter, bortle),
      });
    }, 16);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hydrated, catalogue, site, date, shortlistKey, targetQuery, field, listFilter, bortle]);

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

  function chooseSite(next: Site) {
    setSite(next);
    setPlaceStatus("saved");
    if (bortleModeRef.current === "estimate") setBortle(estimateBortle(next.latitude, next.longitude));
  }

  function setBortleManual(value: number) {
    setBortleMode("manual");
    setBortle(Math.min(9, Math.max(1, Math.round(value))));
  }

  function useBortleEstimate() {
    setBortleMode("estimate");
    setBortle(estimateBortle(site.latitude, site.longitude));
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
    extendedReady: extendedCatalogue != null,
    targetQuery,
    setTargetQuery,
    listFilter,
    setListFilter,
    theme,
    setTheme,
    site,
    chooseSite,
    placeStatus,
    date,
    setDate,
    bortle,
    bortleMode,
    bortleEstimate,
    setBortleManual,
    useBortleEstimate,
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
    addTelescope,
    addCamera,
    addFilter,
    removeCustom,
  };
}

export type Planner = ReturnType<typeof usePlanner>;
