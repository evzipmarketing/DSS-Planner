import type { Camera, ImagingFilter, SensorKind, Site, Telescope, FilterKind } from "@dss/core";
import { isValidTimeZone } from "@dss/core";
import { defaultSite, locations } from "@dss/data";

export type Vision = "ink" | "red";

export type StoredSession = {
  version: 1;
  vision: Vision;
  locationId: string;
  customSite?: Site;
  bortle: number;
  telescopeId: string;
  reducer: number;
  cameraId: string;
  filterIds: string[];
  customTelescopes: Telescope[];
  customCameras: Camera[];
  customFilters: ImagingFilter[];
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
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (parsed.version !== 1) return null;
    return {
      version: 1,
      vision: parsed.vision === "red" ? "red" : "ink",
      locationId: typeof parsed.locationId === "string" ? parsed.locationId : defaultSite.id,
      customSite: parseSite(parsed.customSite),
      bortle: clampInt(parsed.bortle, 1, 9, 7),
      telescopeId: typeof parsed.telescopeId === "string" ? parsed.telescopeId : "",
      reducer: clampNum(parsed.reducer, 0.25, 5, 1),
      cameraId: typeof parsed.cameraId === "string" ? parsed.cameraId : "",
      filterIds: Array.isArray(parsed.filterIds)
        ? parsed.filterIds.filter((id): id is string => typeof id === "string")
        : [],
      customTelescopes: arrayOf(parsed.customTelescopes, isTelescope),
      customCameras: arrayOf(parsed.customCameras, isCamera),
      customFilters: arrayOf(parsed.customFilters, isFilter),
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

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === "number" ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, number));
}

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, number));
}
