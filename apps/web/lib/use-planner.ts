"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  effectiveFocalLengthMm,
  fieldOfView,
  focalRatio,
  frameFillPercent,
  frameFit,
  pixelScaleArcsec,
  rankTargets,
  samplingAdvice,
  type SortDirection,
  type TargetSortKey,
  searchCatalogue,
  sensorDisagreement,
  IMAGEABLE_SAMPLE_MINUTES,
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
  defaultSite,
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

export type PlaceStatus = "detecting" | "gps" | "saved" | "needed";

type PlaceBody = { name?: string; latitude?: number; longitude?: number; timezone?: string };

function localDateIso(timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone && timeZone.length > 0 ? timeZone : undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function usePlanner() {
  const [coreCatalogue, setCoreCatalogue] = useState<DeepSkyObject[] | null>(null);
  const [extendedCatalogue, setExtendedCatalogue] = useState<DeepSkyObject[] | null>(null);
  const [targetQuery, setTargetQuery] = useState<TargetQuery>(EMPTY_TARGET_QUERY);
  const [listFilter, setListFilter] = useState<TargetListFilter>("all");
  const [listSort, setListSort] = useState<TargetSortKey>("recommended");
  const [listSortDirection, setListSortDirection] = useState<SortDirection>("desc");
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [site, setSite] = useState<Site>(defaultSite);
  const [placeStatus, setPlaceStatus] = useState<PlaceStatus>("detecting");
  // UTC on first paint so SSR and the client's initial render match; local/site date is applied after hydrate.
  const [date, setDate] = useState(() => localDateIso("UTC"));
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pointing, setPointing] = useState<Pointing | null>(null);
  const [telescopeId, setTelescopeIdState] = useState("");
  const [reducer, setReducer] = useState(1);
  const [focalOverrideMm, setFocalOverrideMmState] = useState<number | null>(null);
  const [smartModeId, setSmartModeId] = useState<string | null>(null);
  const [cameraId, setCameraIdState] = useState("");
  const [filterIds, setFilterIds] = useState<string[]>([]);
  const [customTelescopes, setCustomTelescopes] = useState<Telescope[]>([]);
  const [customCameras, setCustomCameras] = useState<Camera[]>([]);
  const [customFilters, setCustomFilters] = useState<ImagingFilter[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [ranked, setRanked] = useState<{ key: string; items: RankedTarget[] } | null>(null);
  const [pointingFor, setPointingFor] = useState<string | null>(null);
  const [bortle, setBortle] = useState(() => estimateBortle(defaultSite.latitude, defaultSite.longitude));
  const [bortleLoading, setBortleLoading] = useState(false);
  const hadStoredSite = useRef(false);
  const siteLocked = useRef(false);
  const bortleRequest = useRef(0);

  useEffect(() => {
    // localStorage is only available after mount, so the stored session is applied here.
    /* eslint-disable react-hooks/set-state-in-effect */
    const stored = loadSession();
    if (stored) {
      const hasSite = Boolean(stored.locationId);
      hadStoredSite.current = hasSite;
      if (hasSite) {
        siteLocked.current = true;
        const restored = resolveSite(stored);
        setSite(restored);
        setPlaceStatus("saved");
        setDate(localDateIso(restored.timezone));
      } else {
        setPlaceStatus("detecting");
        setDate(localDateIso());
      }
      setTheme(stored.theme);
      if (stored.telescopeId) setTelescopeIdState(stored.telescopeId);
      setReducer(stored.reducer);
      setFocalOverrideMmState(stored.focalOverrideMm);
      setSmartModeId(stored.smartModeId);
      if (stored.cameraId) setCameraIdState(stored.cameraId);
      setFilterIds(stored.filterIds);
      setListSort(stored.listSort);
      setListSortDirection(stored.listSortDirection);
      setCustomTelescopes(stored.customTelescopes);
      setCustomCameras(stored.customCameras);
      setCustomFilters(stored.customFilters);
    } else {
      setPlaceStatus("detecting");
      setDate(localDateIso());
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated || !navigator.geolocation) {
      if (hydrated && !hadStoredSite.current && !siteLocked.current) setPlaceStatus("needed");
      return;
    }
    // Respect a saved or user-chosen site; only auto-detect on a blank first visit.
    if (hadStoredSite.current || siteLocked.current) return;
    let cancelled = false;
    const requestId = ++bortleRequest.current;
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
            if (cancelled || siteLocked.current || requestId !== bortleRequest.current) return;
            const timezone = place.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            const next: Site = {
              id: "custom",
              name: place.name || "Current location",
              latitude: place.latitude ?? latitude,
              longitude: place.longitude ?? longitude,
              timezone,
            };
            setSite(next);
            setDate(localDateIso(timezone));
            setPlaceStatus("gps");
          })
          .catch(() => {
            if (!cancelled && !siteLocked.current) setPlaceStatus("needed");
          });
      },
      () => {
        if (!cancelled && !siteLocked.current) setPlaceStatus("needed");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    const requestId = ++bortleRequest.current;
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- loading flag for out-of-order location updates */
    setBortleLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const timer = window.setTimeout(() => {
      if (cancelled || requestId !== bortleRequest.current) return;
      const next = estimateBortle(site.latitude, site.longitude);
      if (cancelled || requestId !== bortleRequest.current) return;
      setBortle(next);
      setBortleLoading(false);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [site.latitude, site.longitude]);

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

  const locationReady = placeStatus === "gps" || placeStatus === "saved";

  useEffect(() => {
    if (!hydrated) return;
    saveSession({
      version: 4,
      theme,
      locationId: locationReady ? site.id : "",
      customSite: locationReady && site.id === "custom" ? site : undefined,
      telescopeId,
      reducer,
      focalOverrideMm,
      smartModeId,
      cameraId,
      filterIds,
      listSort,
      listSortDirection,
      customTelescopes,
      customCameras,
      customFilters,
    });
  }, [
    hydrated,
    theme,
    site,
    locationReady,
    telescopeId,
    reducer,
    focalOverrideMm,
    smartModeId,
    cameraId,
    filterIds,
    listSort,
    listSortDirection,
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
  const telescope = telescopes.find((item) => item.id === telescopeId) ?? null;
  const camera = cameraList.find((item) => item.id === cameraId) ?? null;
  const smart = telescope?.smart ?? null;
  const smartMode =
    smart?.modes?.find((mode) => mode.id === smartModeId) ??
    smart?.modes?.find((mode) => mode.focalLengthMm === focalOverrideMm) ??
    smart?.modes?.[0] ??
    null;

  const optics = useMemo<Optics | null>(() => {
    if (!telescope || !camera) return null;
    const apertureMm = smartMode?.apertureMm ?? telescope.apertureMm;
    const focalLengthMm =
      focalOverrideMm ??
      smartMode?.focalLengthMm ??
      (smart ? telescope.focalLengthMm : effectiveFocalLengthMm(telescope, reducer));
    const field = fieldOfView(camera, focalLengthMm);
    const longest = Math.max(field.widthDeg, field.heightDeg);
    const scale = pixelScaleArcsec(camera.pixelSizeUm, focalLengthMm);
    return {
      focalLengthMm,
      focalRatio: focalRatio(apertureMm, focalLengthMm),
      field,
      pixelScale: scale,
      sampling: samplingAdvice(scale, bortle),
      imageFovDeg: Math.min(20, Math.max(0.08, longest * 1.45)),
      disagreement: sensorDisagreement(camera),
    };
  }, [telescope, camera, reducer, focalOverrideMm, bortle, smart, smartMode]);

  const catalogue = useMemo(() => {
    if (!coreCatalogue) return null;
    return extendedCatalogue ? [...coreCatalogue, ...extendedCatalogue] : coreCatalogue;
  }, [coreCatalogue, extendedCatalogue]);

  const field = useMemo(
    () => (optics ? { widthArcmin: optics.field.widthArcmin, heightArcmin: optics.field.heightArcmin } : null),
    [optics],
  );
  // Ranking key includes site/date for altitude and field for good-fit filtering.
  // Displayed frame % is always recomputed from live optics so it tracks gear immediately
  // and cannot drift with date, location, or time.
  const fieldKey = field ? `${field.widthArcmin.toFixed(4)}x${field.heightArcmin.toFixed(4)}` : "none";
  const shortlistKey = `${site.latitude}|${site.longitude}|${site.timezone}|${date}|${targetQuery.types.join(",")}|${targetQuery.catalogues.join(",")}|${targetQuery.maxMagnitude ?? ""}|${targetQuery.minSizeArcmin ?? ""}|${fieldKey}|${listFilter}|${bortle}|${extendedCatalogue ? "extended" : "core"}`;
  const setupReady = locationReady && Boolean(date) && Boolean(telescope) && Boolean(camera);
  const shortlist = useMemo(() => {
    if (!setupReady || ranked?.key !== shortlistKey) return [];
    return ranked.items.map((item) => {
      const fill = frameFillPercent(item.object.majorArcmin, field);
      return {
        ...item,
        frameFillPercent: fill,
        frameFit: frameFit(fill),
      };
    });
  }, [ranked, shortlistKey, field, setupReady]);
  const scoring = Boolean(hydrated && setupReady && catalogue && ranked?.key !== shortlistKey);

  useEffect(() => {
    if (!hydrated || !catalogue || !setupReady) return;
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
  }, [hydrated, catalogue, site, date, shortlistKey, targetQuery, field, listFilter, bortle, setupReady]);

  const selected = useMemo(
    () => catalogue?.find((object) => object.id === selectedId) ?? null,
    [catalogue, selectedId],
  );

  if (selected && pointingFor !== selected.id) {
    setPointingFor(selected.id);
    setPointing({ raDeg: selected.raDeg, decDeg: selected.decDeg, rotationDeg: 0 });
  }

  const track = useMemo<NightTrack | null>(() => {
    if (!selected || !setupReady) return null;
    return buildNightTrack({
      raDeg: selected.raDeg,
      decDeg: selected.decDeg,
      site,
      dateIso: date,
      stepMinutes: IMAGEABLE_SAMPLE_MINUTES,
    });
  }, [selected, site, date, setupReady]);

  const results = useMemo(() => {
    if (!catalogue || query.trim().length < 1) return [];
    return searchCatalogue(catalogue, query, 18);
  }, [catalogue, query]);

  function chooseTarget(id: string) {
    setSelectedId((current) => (current === id ? null : id));
  }

  function focusTarget(id: string | null) {
    setSelectedId(id);
  }

  function setFocalOverrideMm(value: number | null) {
    if (value == null || !Number.isFinite(value)) {
      setFocalOverrideMmState(null);
      return;
    }
    const rounded = Math.round(value);
    if (rounded < 10 || rounded > 20_000) return;
    setFocalOverrideMmState(rounded);
  }

  function setSmartMode(modeId: string) {
    const mode = telescope?.smart?.modes?.find((item) => item.id === modeId);
    if (!mode) return;
    setSmartModeId(mode.id);
    setFocalOverrideMmState(mode.focalLengthMm);
    setReducer(1);
  }

  function setTelescopeId(id: string) {
    setTelescopeIdState(id);
    const scope = [...seedTelescopes, ...customTelescopes].find((item) => item.id === id);
    if (scope?.smart) {
      setCameraIdState(scope.smart.cameraId);
      setReducer(1);
      const mode = scope.smart.modes?.[0] ?? null;
      setSmartModeId(mode?.id ?? null);
      setFocalOverrideMmState(mode?.focalLengthMm ?? null);
      setFilterIds((current) => current.filter((filterId) => scope.smart?.filterIds.includes(filterId)));
      return;
    }
    setSmartModeId(null);
    setFocalOverrideMmState(null);
  }

  function setCameraId(id: string) {
    setCameraIdState(id);
    // Choosing a separate camera leaves a smart scope selection.
    if (telescope?.smart && telescope.smart.cameraId !== id) {
      setTelescopeIdState("");
      setSmartModeId(null);
      setFocalOverrideMmState(null);
    }
  }

  function toggleFilter(id: string) {
    setFilterIds((current) => {
      if (smart?.filterIds.length) {
        // Smart scopes expose a short built-in list; pick one at a time (or none).
        if (!smart.filterIds.includes(id)) return current;
        return current.includes(id) ? [] : [id];
      }
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  }

  function chooseSite(next: Site) {
    siteLocked.current = true;
    bortleRequest.current += 1;
    setSite(next);
    setDate(localDateIso(next.timezone));
    setPlaceStatus("saved");
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
      if (telescopeId === id) {
        setTelescopeIdState("");
        setSmartModeId(null);
        setFocalOverrideMmState(null);
      }
    } else if (kind === "camera") {
      setCustomCameras((current) => current.filter((item) => item.id !== id));
      if (cameraId === id) setCameraIdState("");
    } else {
      setCustomFilters((current) => current.filter((item) => item.id !== id));
      setFilterIds((current) => current.filter((item) => item !== id));
    }
  }

  return {
    catalogue,
    extendedReady: extendedCatalogue != null,
    targetQuery,
    setTargetQuery,
    listFilter,
    setListFilter,
    listSort,
    setListSort,
    listSortDirection,
    setListSortDirection,
    theme,
    setTheme,
    site,
    chooseSite,
    placeStatus,
    locationReady,
    setupReady,
    date,
    setDate,
    bortle,
    bortleLoading,
    query,
    setQuery,
    results,
    shortlist,
    scoring,
    selected,
    chooseTarget,
    focusTarget,
    pointing,
    setPointing,
    track,
    telescopes,
    cameraList,
    filterList,
    telescope,
    camera,
    smartMode,
    setTelescopeId,
    reducer,
    setReducer,
    focalOverrideMm,
    setFocalOverrideMm,
    setSmartMode,
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
