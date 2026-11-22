import type { Camera, ImagingFilter, SensorKind, Site, Telescope, FilterKind, SortDirection, TargetSortKey } from "@dss/core";
import { isValidTimeZone } from "@dss/core";
import { defaultSite, locations } from "@dss/data";

export type ThemeName = "dark" | "night";

/** Named scope + camera combination for multi-rig planning. */
export type GearRig = {
  id: string;
  name: string;
  telescopeId: string;
  cameraId: string;
  reducer: number;
  filterIds: string[];
};

export type StoredSession = {
  version: 6;
  theme: ThemeName;
  locationId: string;
  customSite?: Site;
  savedSites: Site[];
  activeSiteId: string | null;
  telescopeId: string;
  reducer: number;
  focalOverrideMm: number | null;
  smartModeId: string | null;
  cameraId: string;
  filterIds: string[];
  customTelescopes: Telescope[];
  customCameras: Camera[];
  customFilters: ImagingFilter[];
  libraryTelescopeIds: string[];
  libraryCameraIds: string[];
  libraryFilterIds: string[];
  telescopeReducers: Record<string, number>;
  rigs: GearRig[];
  activeRigId: string | null;
  listSort: TargetSortKey;
  listSortDirection: SortDirection;
  /** Include the large extended catalogue in Tonight / search. Off by default. */
  includeExtendedCatalogue: boolean;
  /** Include NGC/IC letter-suffix components (e.g. NGC4676A). Off by default. */
  includeComponentObjects: boolean;
};

const KEY = "dss-planner.session.v1";
const PROFILE_KEY = "dss-planner.profile.v1";

export type LocalProfile = {
  username: string;
  email: string;
  phone: string;
  photoUri: string | null;
};

export const EMPTY_PROFILE: LocalProfile = {
  username: "",
  email: "",
  phone: "",
  photoUri: null,
};

export function loadProfile(): LocalProfile {
  if (typeof window === "undefined") return { ...EMPTY_PROFILE };
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    const parsed = JSON.parse(raw) as Partial<LocalProfile>;
    return {
      username: typeof parsed.username === "string" ? parsed.username : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      photoUri: typeof parsed.photoUri === "string" ? parsed.photoUri : null,
    };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export function saveProfile(profile: LocalProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

const FILTER_KINDS = new Set<FilterKind>([
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
]);

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Omit<Partial<StoredSession>, "version"> & {
      version?: number;
      cameraReducers?: unknown;
    };
    const bag = parsed as { theme?: unknown; vision?: unknown };
    if (
      parsed.version !== 1 &&
      parsed.version !== 2 &&
      parsed.version !== 3 &&
      parsed.version !== 4 &&
      parsed.version !== 5 &&
      parsed.version !== 6
    ) {
      return null;
    }
    const customTelescopes = arrayOf(parsed.customTelescopes, isTelescope);
    const customCameras = arrayOf(parsed.customCameras, isCamera);
    const customFilters = arrayOf(parsed.customFilters, isFilter);
    const telescopeId = typeof parsed.telescopeId === "string" ? parsed.telescopeId : "";
    const cameraId = typeof parsed.cameraId === "string" ? parsed.cameraId : "";
    const filterIds = withoutLegacyDefaultFilter(
      Array.isArray(parsed.filterIds)
        ? parsed.filterIds.filter((id): id is string => typeof id === "string")
        : [],
    );
    const rigs = parseRigs(parsed.rigs);
    const customSite = parseSite(parsed.customSite);
    const savedSites = mergeSavedSites(parseSavedSites((parsed as { savedSites?: unknown }).savedSites), customSite);
    const activeSiteId =
      typeof (parsed as { activeSiteId?: unknown }).activeSiteId === "string" &&
      savedSites.some((site) => site.id === (parsed as { activeSiteId: string }).activeSiteId)
        ? (parsed as { activeSiteId: string }).activeSiteId
        : (savedSites.find((site) => site.id === (typeof parsed.locationId === "string" ? parsed.locationId : ""))?.id ??
          savedSites[0]?.id ??
          null);
    const libraryTelescopeIds = uniqueIds([
      ...(Array.isArray(parsed.libraryTelescopeIds) ? parsed.libraryTelescopeIds : []),
      ...customTelescopes.map((item) => item.id),
      ...rigs.map((rig) => rig.telescopeId),
      telescopeId,
    ]);
    const libraryCameraIds = uniqueIds([
      ...(Array.isArray(parsed.libraryCameraIds) ? parsed.libraryCameraIds : []),
      ...customCameras.map((item) => item.id),
      ...rigs.map((rig) => rig.cameraId),
      cameraId,
    ]);
    const libraryFilterIds = uniqueIds([
      ...(Array.isArray(parsed.libraryFilterIds) ? parsed.libraryFilterIds : []),
      ...customFilters.map((item) => item.id),
      ...rigs.flatMap((rig) => rig.filterIds),
      ...filterIds,
    ]);
    return {
      version: 6,
      theme: parseTheme(bag.theme, bag.vision),
      locationId: typeof parsed.locationId === "string" ? parsed.locationId : "",
      customSite,
      savedSites,
      activeSiteId,
      telescopeId,
      reducer: clampNum(parsed.reducer, 0.25, 5, 1),
      focalOverrideMm: parseFocal(parsed.focalOverrideMm),
      smartModeId: typeof parsed.smartModeId === "string" ? parsed.smartModeId : null,
      cameraId,
      filterIds,
      customTelescopes,
      customCameras,
      customFilters,
      libraryTelescopeIds,
      libraryCameraIds,
      libraryFilterIds,
      telescopeReducers: parseFactorMap(parsed.telescopeReducers ?? parsed.cameraReducers),
      rigs,
      activeRigId: typeof parsed.activeRigId === "string" ? parsed.activeRigId : null,
      listSort: parseSortKey(parsed.listSort),
      listSortDirection: parsed.listSortDirection === "asc" || parsed.listSortDirection === "desc" ? parsed.listSortDirection : "desc",
      includeExtendedCatalogue: parsed.includeExtendedCatalogue === true,
      includeComponentObjects: parsed.includeComponentObjects === true,
    };
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function resolveSite(
  session: Pick<StoredSession, "locationId" | "customSite" | "savedSites" | "activeSiteId">,
): Site {
  if (session.activeSiteId) {
    const active = session.savedSites.find((site) => site.id === session.activeSiteId);
    if (active) return active;
  }
  if (session.locationId) {
    const byId = session.savedSites.find((site) => site.id === session.locationId);
    if (byId) return byId;
    const preset = locations.find((site) => site.id === session.locationId);
    if (preset) return preset;
  }
  if (session.customSite) return session.customSite;
  if (session.savedSites[0]) return session.savedSites[0];
  return defaultSite;
}

function parseSavedSites(value: unknown): Site[] {
  if (!Array.isArray(value)) return [];
  const sites: Site[] = [];
  for (const row of value) {
    const site = parseSite(row);
    if (site) sites.push(site);
  }
  return sites;
}

function mergeSavedSites(saved: Site[], customSite: Site | undefined): Site[] {
  const sites = [...saved];
  if (customSite && !sites.some((site) => samePlace(site, customSite))) {
    sites.unshift(customSite.id === "custom" ? { ...customSite, id: `site-${Date.now()}` } : customSite);
  }
  return sites;
}

function samePlace(a: Site, b: Site): boolean {
  return (
    a.id === b.id ||
    (Math.abs(a.latitude - b.latitude) < 1e-4 && Math.abs(a.longitude - b.longitude) < 1e-4)
  );
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
}

function parseRigs(value: unknown): GearRig[] {
  if (!Array.isArray(value)) return [];
  const rigs: GearRig[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const item = row as Partial<GearRig>;
    if (typeof item.id !== "string" || typeof item.name !== "string") continue;
    if (typeof item.telescopeId !== "string" || typeof item.cameraId !== "string") continue;
    rigs.push({
      id: item.id,
      name: item.name.trim() || "Rig",
      telescopeId: item.telescopeId,
      cameraId: item.cameraId,
      reducer: typeof item.reducer === "number" && item.reducer > 0 ? item.reducer : 1,
      filterIds: Array.isArray(item.filterIds)
        ? item.filterIds.filter((id): id is string => typeof id === "string")
        : [],
    });
  }
  return rigs;
}

function parseFactorMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [id, factor] of Object.entries(value as Record<string, unknown>)) {
    if (typeof factor === "number" && factor > 0) out[id] = factor;
  }
  return out;
}

function parseFocal(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 10 || rounded > 20_000) return null;
  return rounded;
}

/** Sessions saved before "no filter" stored the old Astronomik default as the only chip. */
function withoutLegacyDefaultFilter(ids: string[]): string[] {
  if (ids.length === 1 && ids[0] === "astronomik-l2") return [];
  return ids;
}

function parseSortKey(value: unknown): TargetSortKey {
  if (value === "recommended" || value === "frame" || value === "imageable" || value === "rise") return value;
  return "recommended";
}

function parseTheme(theme: unknown, legacyVision: unknown): ThemeName {
  if (theme === "night" || legacyVision === "red" || theme === "red") return "night";
  // Light is disabled for now; stored "light" sessions fall back to dark.
  if (theme === "dark" || theme === "light") return "dark";
  return "dark";
}

function parseSite(value: unknown): Site | undefined {
  if (!value || typeof value !== "object") return undefined;
  const site = value as Site;
  if (typeof site.name !== "string" || !isValidTimeZone(site.timezone)) return undefined;
  if (!Number.isFinite(site.latitude) || site.latitude < -90 || site.latitude > 90) return undefined;
  if (!Number.isFinite(site.longitude) || site.longitude < -180 || site.longitude > 180) return undefined;
  return {
    id: "custom",
    name: site.name || "Custom site",
    latitude: site.latitude,
    longitude: site.longitude,
    timezone: site.timezone,
  };
}

function isTelescope(value: unknown): value is Telescope {
  if (!value || typeof value !== "object") return false;
  const item = value as Telescope;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    item.apertureMm > 0 &&
    item.focalLengthMm > 0
  );
}

function isCamera(value: unknown): value is Camera {
  if (!value || typeof value !== "object") return false;
  const item = value as Camera;
  const sensor: SensorKind | null = item.sensor === "mono" || item.sensor === "colour" ? item.sensor : null;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    sensor != null &&
    item.sensorWidthMm > 0 &&
    item.sensorHeightMm > 0 &&
    item.pixelSizeUm > 0 &&
    item.widthPx > 0 &&
    item.heightPx > 0 &&
    item.readNoiseE > 0
  );
}

function isFilter(value: unknown): value is ImagingFilter {
  if (!value || typeof value !== "object") return false;
  const item = value as ImagingFilter;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    FILTER_KINDS.has(item.kind) &&
    item.bandpassNm > 0 &&
    item.transmission > 0 &&
    item.transmission <= 1
  );
}

function arrayOf<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(guard);
}

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, number));
}
