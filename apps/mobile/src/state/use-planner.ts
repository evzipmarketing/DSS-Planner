import { useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_TARGET_QUERY,
  IMAGEABLE_SAMPLE_MINUTES,
  bandAdvice,
  buildNightTrack,
  isComponentObject,
  effectiveFocalLengthMm,
  fieldOfView,
  focalRatio,
  frameFillPercent,
  frameFit,
  pixelScaleArcsec,
  rankTargets,
  samplingAdvice,
  searchCatalogue,
  sensorDisagreement,
  type Camera,
  type DeepSkyObject,
  type FieldOfView,
  type ImagingFilter,
  type NightTrack,
  type RankedTarget,
  type SamplingAdvice,
  type Site,
  type SortDirection,
  type TargetListFilter,
  type TargetQuery,
  type TargetSortKey,
  type Telescope,
} from "@dss/core";
import {
  cameras as seedCameras,
  defaultSite,
  estimateBortle,
  filters as seedFilters,
  telescopes as seedTelescopes,
} from "@dss/data";
import * as Location from "expo-location";
import { fetchPlace } from "@/lib/api";
import { loadSession, resolveSite, saveSession, type GearRig } from "@/lib/storage";
import type { ThemeName } from "@/theme/tokens";

export type Pointing = { raDeg: number; decDeg: number; rotationDeg: number };

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

function localDateIso(timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone && timeZone.length > 0 ? timeZone : undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function uniqueNonEmpty(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => id.length > 0))];
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
  const [date, setDate] = useState(() => localDateIso());
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
  const [libraryTelescopeIds, setLibraryTelescopeIds] = useState<string[]>([]);
  const [libraryCameraIds, setLibraryCameraIds] = useState<string[]>([]);
  const [libraryFilterIds, setLibraryFilterIds] = useState<string[]>([]);
  const [telescopeReducers, setTelescopeReducers] = useState<Record<string, number>>({});
  const [rigs, setRigs] = useState<GearRig[]>([]);
  const [activeRigId, setActiveRigId] = useState<string | null>(null);
  const [savedSites, setSavedSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [ranked, setRanked] = useState<{ key: string; items: RankedTarget[] } | null>(null);
  const [pointingFor, setPointingFor] = useState<string | null>(null);
  const [bortle, setBortle] = useState(() => estimateBortle(defaultSite.latitude, defaultSite.longitude));
  const [bortleLoading, setBortleLoading] = useState(false);
  const [includeExtendedCatalogue, setIncludeExtendedCatalogue] = useState(false);
  const [includeComponentObjects, setIncludeComponentObjects] = useState(false);
  const hadStoredSite = useRef(false);
  const siteLocked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadSession();
      if (cancelled) return;
      if (stored) {
        const hasSite = Boolean(stored.locationId);
        hadStoredSite.current = hasSite;
        setSavedSites(stored.savedSites);
        setActiveSiteId(stored.activeSiteId);
        if (hasSite || stored.savedSites.length > 0) {
          siteLocked.current = true;
          const restored = resolveSite(stored);
          setSite(restored);
          setActiveSiteId(stored.activeSiteId ?? restored.id);
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
        setLibraryTelescopeIds(stored.libraryTelescopeIds);
        setLibraryCameraIds(stored.libraryCameraIds);
        setLibraryFilterIds(stored.libraryFilterIds);
        setTelescopeReducers(stored.telescopeReducers);
        setRigs(stored.rigs);
        setActiveRigId(stored.activeRigId);
        setIncludeExtendedCatalogue(stored.includeExtendedCatalogue);
        setIncludeComponentObjects(stored.includeComponentObjects);
      } else {
        setPlaceStatus("detecting");
        setDate(localDateIso());
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (hadStoredSite.current || siteLocked.current) return;
    let cancelled = false;
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (permission.status !== "granted") {
        setPlaceStatus("needed");
        return;
      }
      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled || siteLocked.current) return;
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        try {
          const place = await fetchPlace(latitude, longitude);
          if (cancelled || siteLocked.current) return;
          const timezone = place.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
          setSite({
            id: "custom",
            name: place.name || "Current location",
            latitude: place.latitude ?? latitude,
            longitude: place.longitude ?? longitude,
            timezone,
          });
          setDate(localDateIso(timezone));
          setPlaceStatus("gps");
        } catch {
          if (!cancelled && !siteLocked.current) setPlaceStatus("needed");
        }
      } catch {
        if (!cancelled && !siteLocked.current) setPlaceStatus("needed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    setBortleLoading(true);
    const timer = setTimeout(() => {
      setBortle(estimateBortle(site.latitude, site.longitude));
      setBortleLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [site.latitude, site.longitude]);

  useEffect(() => {
    let cancelled = false;
    void import("@dss/data/catalogue").then((module) => {
      if (!cancelled) setCoreCatalogue(module.deepSkyCore);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!includeExtendedCatalogue) {
      setExtendedCatalogue(null);
      return;
    }
    let cancelled = false;
    void import("@dss/data/catalogue-extended").then((module) => {
      if (!cancelled) setExtendedCatalogue(module.deepSkyExtended);
    });
    return () => {
      cancelled = true;
    };
  }, [includeExtendedCatalogue]);

  const locationReady = placeStatus === "gps" || placeStatus === "saved";

  useEffect(() => {
    if (!hydrated) return;
    void saveSession({
      version: 5,
      theme,
      locationId: locationReady ? site.id : "",
      customSite: locationReady ? site : undefined,
      savedSites,
      activeSiteId,
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
      libraryTelescopeIds,
      libraryCameraIds,
      libraryFilterIds,
      telescopeReducers,
      rigs,
      activeRigId,
      includeExtendedCatalogue,
      includeComponentObjects,
    });
  }, [
    hydrated,
    theme,
    site,
    locationReady,
    savedSites,
    activeSiteId,
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
    libraryTelescopeIds,
    libraryCameraIds,
    libraryFilterIds,
    telescopeReducers,
    rigs,
    activeRigId,
    includeExtendedCatalogue,
    includeComponentObjects,
  ]);

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
    const merged =
      includeExtendedCatalogue && extendedCatalogue ? [...coreCatalogue, ...extendedCatalogue] : coreCatalogue;
    return includeComponentObjects ? merged : merged.filter((object) => !isComponentObject(object));
  }, [coreCatalogue, extendedCatalogue, includeExtendedCatalogue, includeComponentObjects]);

  const field = useMemo(
    () => (optics ? { widthArcmin: optics.field.widthArcmin, heightArcmin: optics.field.heightArcmin } : null),
    [optics],
  );
  const fieldKey = field ? `${field.widthArcmin.toFixed(4)}x${field.heightArcmin.toFixed(4)}` : "none";
  const shortlistKey = `${site.latitude}|${site.longitude}|${site.timezone}|${date}|${targetQuery.types.join(",")}|${targetQuery.catalogues.join(",")}|${targetQuery.maxMagnitude ?? ""}|${targetQuery.minSizeArcmin ?? ""}|${fieldKey}|${listFilter}|${bortle}|${includeExtendedCatalogue ? "extended" : "core"}|${includeComponentObjects ? "components" : "hosts"}`;
  const setupReady = locationReady && Boolean(date) && Boolean(telescope) && Boolean(camera);

  const shortlist = useMemo(() => {
    if (!setupReady || ranked?.key !== shortlistKey) return [];
    return ranked.items.map((item) => {
      const fill = frameFillPercent(item.object.majorArcmin, field);
      return { ...item, frameFillPercent: fill, frameFit: frameFit(fill) };
    });
  }, [ranked, shortlistKey, field, setupReady]);

  const scoring = Boolean(hydrated && setupReady && catalogue && ranked?.key !== shortlistKey);

  useEffect(() => {
    if (!hydrated || !catalogue || !setupReady) return;
    const timer = setTimeout(() => {
      setRanked({
        key: shortlistKey,
        items: rankTargets(catalogue, site, date, 100, targetQuery, field, listFilter, bortle),
      });
    }, 16);
    return () => clearTimeout(timer);
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
      band: bandAdvice(selected.type),
    });
  }, [selected, site, date, setupReady]);

  const results = useMemo(() => {
    if (!catalogue || query.trim().length < 1) return [];
    return searchCatalogue(catalogue, query, 18);
  }, [catalogue, query]);

  function chooseTarget(id: string | null) {
    setSelectedId(id);
  }

  function setTelescopeId(id: string) {
    setActiveRigId(null);
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
    setActiveRigId(null);
    setCameraIdState(id);
    if (telescope?.smart && telescope.smart.cameraId !== id) {
      setTelescopeIdState("");
      setSmartModeId(null);
      setFocalOverrideMmState(null);
    }
  }

  function setSmartMode(modeId: string) {
    const mode = telescope?.smart?.modes?.find((item) => item.id === modeId);
    if (!mode) return;
    setSmartModeId(mode.id);
    setFocalOverrideMmState(mode.focalLengthMm);
    setReducer(1);
  }

  function toggleFilter(id: string) {
    setFilterIds((current) => {
      if (smart?.filterIds.length) {
        if (!smart.filterIds.includes(id)) return current;
        return current.includes(id) ? [] : [id];
      }
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  }

  function normalizeSite(next: Site): Site {
    if (next.id && next.id !== "custom") return next;
    return {
      ...next,
      id: `site-${Date.now()}-${Math.round(Math.abs(next.latitude) * 1000)}`,
    };
  }

  function upsertSavedSite(next: Site): Site {
    const siteToSave = normalizeSite(next);
    setSavedSites((current) => {
      const without = current.filter(
        (item) =>
          item.id !== siteToSave.id &&
          !(Math.abs(item.latitude - siteToSave.latitude) < 1e-4 && Math.abs(item.longitude - siteToSave.longitude) < 1e-4),
      );
      return [siteToSave, ...without];
    });
    return siteToSave;
  }

  function chooseSite(next: Site) {
    siteLocked.current = true;
    const saved = upsertSavedSite(next);
    setSite(saved);
    setActiveSiteId(saved.id);
    setDate(localDateIso(saved.timezone));
    setPlaceStatus("saved");
  }

  function selectSavedSite(id: string) {
    const found = savedSites.find((item) => item.id === id);
    if (!found) return;
    chooseSite(found);
  }

  function deleteSavedSite(id: string) {
    setSavedSites((current) => {
      const next = current.filter((item) => item.id !== id);
      if (activeSiteId === id) {
        const fallback = next[0] ?? null;
        if (fallback) {
          siteLocked.current = true;
          setSite(fallback);
          setActiveSiteId(fallback.id);
          setDate(localDateIso(fallback.timezone));
          setPlaceStatus("saved");
        } else {
          setActiveSiteId(null);
          setPlaceStatus("needed");
        }
      }
      return next;
    });
  }

  function saveSite(next: Site): Site {
    const saved = upsertSavedSite(next);
    return saved;
  }

  function ensureLibraryTelescope(id: string) {
    setLibraryTelescopeIds((current) => (current.includes(id) ? current : [...current, id]));
  }

  function ensureLibraryCamera(id: string) {
    setLibraryCameraIds((current) => (current.includes(id) ? current : [...current, id]));
  }

  function ensureLibraryFilter(id: string) {
    setLibraryFilterIds((current) => (current.includes(id) ? current : [...current, id]));
  }

  function addTelescopeToLibrary(id: string, preferredReducer?: number) {
    ensureLibraryTelescope(id);
    if (preferredReducer && preferredReducer > 0) {
      setTelescopeReducers((current) => ({ ...current, [id]: preferredReducer }));
    }
  }

  function addCameraToLibrary(id: string) {
    ensureLibraryCamera(id);
  }

  function addFilterToLibrary(id: string) {
    ensureLibraryFilter(id);
  }

  function setTelescopePreferredReducer(id: string, factor: number) {
    if (!(factor > 0)) return;
    setTelescopeReducers((current) => ({ ...current, [id]: factor }));
  }

  function deleteTelescopeFromLibrary(id: string) {
    setLibraryTelescopeIds((current) => current.filter((item) => item !== id));
    setCustomTelescopes((current) => current.filter((item) => item.id !== id));
    setTelescopeReducers((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
    setRigs((current) => {
      const next = current.filter((rig) => rig.telescopeId !== id);
      setActiveRigId((active) => (active && next.some((rig) => rig.id === active) ? active : null));
      return next;
    });
    if (telescopeId === id) setTelescopeIdState("");
  }

  function deleteCameraFromLibrary(id: string) {
    setLibraryCameraIds((current) => current.filter((item) => item !== id));
    setCustomCameras((current) => current.filter((item) => item.id !== id));
    setRigs((current) => {
      const next = current.filter((rig) => rig.cameraId !== id);
      setActiveRigId((active) => (active && next.some((rig) => rig.id === active) ? active : null));
      return next;
    });
    if (cameraId === id) setCameraIdState("");
  }

  function deleteFilterFromLibrary(id: string) {
    setLibraryFilterIds((current) => current.filter((item) => item !== id));
    setCustomFilters((current) => current.filter((item) => item.id !== id));
    setFilterIds((current) => current.filter((item) => item !== id));
    setRigs((current) =>
      current.map((rig) => ({
        ...rig,
        filterIds: rig.filterIds.filter((filterId) => filterId !== id),
      })),
    );
  }

  function addCustomTelescope(input: {
    name: string;
    apertureMm: number;
    focalLengthMm: number;
    preferredReducer?: number;
  }): Telescope {
    const created: Telescope = {
      id: `custom-scope-${Date.now()}`,
      name: input.name.trim(),
      apertureMm: input.apertureMm,
      focalLengthMm: input.focalLengthMm,
      custom: true,
    };
    setCustomTelescopes((current) => [...current, created]);
    ensureLibraryTelescope(created.id);
    if (input.preferredReducer && input.preferredReducer > 0) {
      setTelescopeReducers((current) => ({ ...current, [created.id]: input.preferredReducer! }));
      setReducer(input.preferredReducer);
    }
    // Select immediately from the created object — customTelescopes is stale until next render.
    setActiveRigId(null);
    setTelescopeIdState(created.id);
    setSmartModeId(null);
    setFocalOverrideMmState(null);
    return created;
  }

  function addCustomCamera(input: {
    name: string;
    sensorWidthMm: number;
    sensorHeightMm: number;
    pixelSizeUm: number;
    widthPx: number;
    heightPx: number;
    sensor: "mono" | "colour";
    readNoiseE: number;
  }): Camera {
    const created: Camera = {
      id: `custom-cam-${Date.now()}`,
      name: input.name.trim(),
      sensorWidthMm: input.sensorWidthMm,
      sensorHeightMm: input.sensorHeightMm,
      pixelSizeUm: input.pixelSizeUm,
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      sensor: input.sensor,
      readNoiseE: input.readNoiseE,
      custom: true,
    };
    setCustomCameras((current) => [...current, created]);
    ensureLibraryCamera(created.id);
    setActiveRigId(null);
    setCameraIdState(created.id);
    if (telescope?.smart && telescope.smart.cameraId !== created.id) {
      setTelescopeIdState("");
      setSmartModeId(null);
      setFocalOverrideMmState(null);
    }
    return created;
  }

  function addCustomFilter(input: {
    name: string;
    kind: ImagingFilter["kind"];
    bandpassNm: number;
    transmission: number;
  }): ImagingFilter {
    const created: ImagingFilter = {
      id: `custom-filter-${Date.now()}`,
      name: input.name.trim(),
      kind: input.kind,
      bandpassNm: input.bandpassNm,
      transmission: input.transmission,
      custom: true,
    };
    setCustomFilters((current) => [...current, created]);
    ensureLibraryFilter(created.id);
    return created;
  }

  function createRig(input: {
    name: string;
    telescopeId: string;
    cameraId: string;
    reducer?: number;
    filterIds?: string[];
  }): GearRig | null {
    const scope = [...seedTelescopes, ...customTelescopes].find((item) => item.id === input.telescopeId);
    const cam = [...seedCameras, ...customCameras].find((item) => item.id === input.cameraId);
    if (!scope || !cam) return null;
    const cameraForRig = scope.smart ? scope.smart.cameraId : input.cameraId;
    const filtersForRig = uniqueNonEmpty(
      scope.smart?.filterIds?.length
        ? (input.filterIds ?? []).filter((id) => scope.smart?.filterIds.includes(id))
        : (input.filterIds ?? []),
    );
    const rig: GearRig = {
      id: `rig-${Date.now()}`,
      name: input.name.trim() || `${scope.name} + ${cam.name}`,
      telescopeId: input.telescopeId,
      cameraId: cameraForRig,
      reducer: input.reducer && input.reducer > 0 ? input.reducer : 1,
      filterIds: filtersForRig,
    };
    ensureLibraryTelescope(rig.telescopeId);
    ensureLibraryCamera(rig.cameraId);
    for (const filterId of rig.filterIds) ensureLibraryFilter(filterId);
    setRigs((current) => [...current, rig]);
    return rig;
  }

  function deleteRig(id: string) {
    setRigs((current) => current.filter((rig) => rig.id !== id));
    setActiveRigId((current) => (current === id ? null : current));
  }

  function selectRig(id: string) {
    const rig = rigs.find((item) => item.id === id);
    if (!rig) return;
    const scope = [...seedTelescopes, ...customTelescopes].find((item) => item.id === rig.telescopeId);
    setActiveRigId(id);
    setTelescopeIdState(rig.telescopeId);
    setCameraIdState(rig.cameraId);
    setReducer(rig.reducer);
    setFilterIds(rig.filterIds);
    if (scope?.smart) {
      const mode = scope.smart.modes?.[0] ?? null;
      setSmartModeId(mode?.id ?? null);
      setFocalOverrideMmState(mode?.focalLengthMm ?? null);
    } else {
      setSmartModeId(null);
      setFocalOverrideMmState(null);
    }
  }

  function clearActiveRig() {
    setActiveRigId(null);
  }

  return {
    catalogue,
    extendedReady: !includeExtendedCatalogue || extendedCatalogue != null,
    includeExtendedCatalogue,
    setIncludeExtendedCatalogue,
    includeComponentObjects,
    setIncludeComponentObjects,
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
    savedSites,
    activeSiteId,
    selectSavedSite,
    deleteSavedSite,
    saveSite,
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
    setFocalOverrideMm: setFocalOverrideMmState,
    setSmartMode,
    setCameraId,
    filterIds,
    toggleFilter,
    optics,
    hydrated,
    libraryTelescopeIds,
    libraryCameraIds,
    libraryFilterIds,
    telescopeReducers,
    rigs,
    activeRigId,
    addTelescopeToLibrary,
    addCameraToLibrary,
    addFilterToLibrary,
    setTelescopePreferredReducer,
    deleteTelescopeFromLibrary,
    deleteCameraFromLibrary,
    deleteFilterFromLibrary,
    addCustomTelescope,
    addCustomCamera,
    addCustomFilter,
    createRig,
    deleteRig,
    selectRig,
    clearActiveRig,
  };
}

export type Planner = ReturnType<typeof usePlanner>;
