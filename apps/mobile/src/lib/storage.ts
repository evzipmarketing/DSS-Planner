import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Camera, ImagingFilter, Site, Telescope, SortDirection, TargetSortKey } from "@dss/core";
import { isValidTimeZone } from "@dss/core";
import { defaultSite } from "@dss/data";
import type { ThemeName } from "@/theme/tokens";

const SESSION_KEY = "dss-mobile.session.v1";
const LISTS_KEY = "dss-mobile.lists.v1";
const PROFILE_KEY = "dss-mobile.profile.v1";
const WEATHER_CACHE_KEY = "dss-mobile.weather.v1";
const PLATE_CACHE_KEY = "dss-mobile.plates.v1";

export type LocalProfile = {
  username: string;
  phone: string;
  photoUri: string | null;
};

export const EMPTY_PROFILE: LocalProfile = {
  username: "",
  phone: "",
  photoUri: null,
};

/** Named scope + camera combination for multi-rig planning. */
export type GearRig = {
  id: string;
  name: string;
  telescopeId: string;
  cameraId: string;
  reducer: number;
};

export type StoredSession = {
  version: 4;
  theme: ThemeName;
  locationId: string;
  customSite?: Site;
  /** Saved observing sites (multi-location library). */
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
  /** User equipment library (seed or custom ids). */
  libraryTelescopeIds: string[];
  libraryCameraIds: string[];
  rigs: GearRig[];
  activeRigId: string | null;
  listSort: TargetSortKey;
  listSortDirection: SortDirection;
  includeExtendedCatalogue: boolean;
  includeComponentObjects: boolean;
};

export type LocalList = {
  id: string;
  name: string;
  createdAt: string;
  items: { objectId: string; notes: string; sortOrder: number }[];
};

export type LocalListsState = {
  favorites: string[];
  lists: LocalList[];
};

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Omit<StoredSession, "version">> & { version?: number };
    if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3 && parsed.version !== 4) return null;
    const customTelescopes = Array.isArray(parsed.customTelescopes) ? (parsed.customTelescopes as Telescope[]) : [];
    const customCameras = Array.isArray(parsed.customCameras) ? (parsed.customCameras as Camera[]) : [];
    const telescopeId = typeof parsed.telescopeId === "string" ? parsed.telescopeId : "";
    const cameraId = typeof parsed.cameraId === "string" ? parsed.cameraId : "";
    const rigs = parseRigs(parsed.rigs);
    const customSite = parseSite(parsed.customSite);
    const savedSites = mergeSavedSites(parseSavedSites(parsed.savedSites), customSite);
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
    const activeSiteId =
      typeof parsed.activeSiteId === "string" && savedSites.some((site) => site.id === parsed.activeSiteId)
        ? parsed.activeSiteId
        : (savedSites.find((site) => site.id === parsed.locationId)?.id ??
          savedSites[0]?.id ??
          null);
    return {
      version: 4,
      theme: parsed.theme === "night" ? "night" : "dark",
      locationId: typeof parsed.locationId === "string" ? parsed.locationId : "",
      customSite,
      savedSites,
      activeSiteId,
      telescopeId,
      reducer: typeof parsed.reducer === "number" ? parsed.reducer : 1,
      focalOverrideMm: typeof parsed.focalOverrideMm === "number" ? parsed.focalOverrideMm : null,
      smartModeId: typeof parsed.smartModeId === "string" ? parsed.smartModeId : null,
      cameraId,
      filterIds: Array.isArray(parsed.filterIds) ? parsed.filterIds.filter((id): id is string => typeof id === "string") : [],
      customTelescopes,
      customCameras,
      customFilters: Array.isArray(parsed.customFilters) ? (parsed.customFilters as ImagingFilter[]) : [],
      libraryTelescopeIds,
      libraryCameraIds,
      rigs,
      activeRigId: typeof parsed.activeRigId === "string" ? parsed.activeRigId : null,
      listSort: parseSort(parsed.listSort),
      listSortDirection: parsed.listSortDirection === "asc" ? "asc" : "desc",
      includeExtendedCatalogue: parsed.includeExtendedCatalogue === true,
      includeComponentObjects: parsed.includeComponentObjects === true,
    };
  } catch {
    return null;
  }
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
    });
  }
  return rigs;
}

export async function saveSession(session: StoredSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
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
  }
  if (session.customSite) return session.customSite;
  if (session.savedSites[0]) return session.savedSites[0];
  return defaultSite;
}

export async function loadLists(): Promise<LocalListsState> {
  try {
    const raw = await AsyncStorage.getItem(LISTS_KEY);
    if (!raw) return { favorites: [], lists: [] };
    const parsed = JSON.parse(raw) as LocalListsState;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter((id) => typeof id === "string") : [],
      lists: Array.isArray(parsed.lists) ? parsed.lists : [],
    };
  } catch {
    return { favorites: [], lists: [] };
  }
}

export async function saveLists(state: LocalListsState): Promise<void> {
  await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(state));
}

export async function loadProfile(): Promise<LocalProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    const parsed = JSON.parse(raw) as Partial<LocalProfile>;
    return {
      username: typeof parsed.username === "string" ? parsed.username : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      photoUri: typeof parsed.photoUri === "string" ? parsed.photoUri : null,
    };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export async function saveProfile(profile: LocalProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function cacheWeather(key: string, payload: unknown): Promise<void> {
  await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ key, at: Date.now(), payload }));
}

export async function readWeatherCache(key: string): Promise<unknown | null> {
  try {
    const raw = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key: string; payload: unknown };
    return parsed.key === key ? parsed.payload : null;
  } catch {
    return null;
  }
}

export async function cachePlate(key: string, uri: string): Promise<void> {
  const raw = await AsyncStorage.getItem(PLATE_CACHE_KEY);
  const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  const entries = Object.entries({ ...map, [key]: uri }).slice(-8);
  await AsyncStorage.setItem(PLATE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
}

export async function readPlateCache(key: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(PLATE_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[key] ?? null;
  } catch {
    return null;
  }
}

function parseSite(value: unknown): Site | undefined {
  return parseOneSite(value);
}

function parseSavedSites(value: unknown): Site[] {
  if (!Array.isArray(value)) return [];
  const sites: Site[] = [];
  for (const row of value) {
    const site = parseOneSite(row);
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
  if (a.id && b.id && a.id === b.id && a.id !== "custom") return true;
  return Math.abs(a.latitude - b.latitude) < 1e-4 && Math.abs(a.longitude - b.longitude) < 1e-4;
}

function parseOneSite(value: unknown): Site | undefined {
  if (!value || typeof value !== "object") return undefined;
  const site = value as Partial<Site>;
  if (typeof site.name !== "string" || typeof site.timezone !== "string" || !isValidTimeZone(site.timezone)) {
    return undefined;
  }
  if (!Number.isFinite(site.latitude) || !Number.isFinite(site.longitude)) return undefined;
  const id =
    typeof site.id === "string" && site.id.trim().length > 0
      ? site.id
      : `site-${Math.round((site.latitude as number) * 10000)}-${Math.round((site.longitude as number) * 10000)}`;
  return {
    id,
    name: site.name.trim() || "Saved site",
    latitude: site.latitude as number,
    longitude: site.longitude as number,
    timezone: site.timezone,
  };
}

function parseSort(value: unknown): TargetSortKey {
  if (value === "recommended" || value === "frame" || value === "imageable" || value === "rise") return value;
  return "recommended";
}
