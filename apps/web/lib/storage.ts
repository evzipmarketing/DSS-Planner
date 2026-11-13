import type { Camera, ImagingFilter, SensorKind, Site, Telescope, FilterKind, SortDirection, TargetSortKey } from "@dss/core";
import { isValidTimeZone } from "@dss/core";
import { defaultSite, locations } from "@dss/data";

export type ThemeName = "light" | "dark" | "night";

export type StoredSession = {
  version: 3;
  theme: ThemeName;
  locationId: string;
  customSite?: Site;
  telescopeId: string;
  reducer: number;
  focalOverrideMm: number | null;
  cameraId: string;
  filterIds: string[];
  customTelescopes: Telescope[];
  customCameras: Camera[];
  customFilters: ImagingFilter[];
  listSort: TargetSortKey;
  listSortDirection: SortDirection;
};

const KEY = "dss-planner.session.v1";

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
    const parsed = JSON.parse(raw) as Omit<Partial<StoredSession>, "version"> & { version?: number };
    const bag = parsed as { theme?: unknown; vision?: unknown };
    if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) return null;
    return {
      version: 3,
      theme: parseTheme(bag.theme, bag.vision),
      locationId: typeof parsed.locationId === "string" ? parsed.locationId : defaultSite.id,
      customSite: parseSite(parsed.customSite),
      telescopeId: typeof parsed.telescopeId === "string" ? parsed.telescopeId : "",
      reducer: clampNum(parsed.reducer, 0.25, 5, 1),
      focalOverrideMm: parseFocal(parsed.focalOverrideMm),
      cameraId: typeof parsed.cameraId === "string" ? parsed.cameraId : "",
      filterIds: withoutLegacyDefaultFilter(
        Array.isArray(parsed.filterIds)
          ? parsed.filterIds.filter((id): id is string => typeof id === "string")
          : [],
      ),
      customTelescopes: arrayOf(parsed.customTelescopes, isTelescope),
      customCameras: arrayOf(parsed.customCameras, isCamera),
      customFilters: arrayOf(parsed.customFilters, isFilter),
      listSort: parseSortKey(parsed.listSort),
      listSortDirection: parsed.listSortDirection === "asc" || parsed.listSortDirection === "desc" ? parsed.listSortDirection : "desc",
    };
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function resolveSite(session: Pick<StoredSession, "locationId" | "customSite">): Site {
  const preset = locations.find((site) => site.id === session.locationId);
  if (preset) return preset;
  if (session.customSite) return session.customSite;
  return defaultSite;
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
  if (theme === "light" || theme === "dark" || theme === "night") return theme;
  if (legacyVision === "red" || theme === "red") return "night";
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
