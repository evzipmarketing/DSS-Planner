import Constants from "expo-constants";
import { cachePlate, cacheWeather, readPlateCache, readWeatherCache } from "./storage";

function apiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:3000`;
  return "http://localhost:3000";
}

export function getApiBase(): string {
  return apiBase();
}

export async function fetchPlace(lat: number, lon: number): Promise<{
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}> {
  const response = await fetch(`${apiBase()}/api/place?lat=${lat}&lon=${lon}`);
  if (!response.ok) throw new Error("place");
  return (await response.json()) as { name?: string; latitude?: number; longitude?: number; timezone?: string };
}

export async function fetchGeocode(query: string): Promise<{ id: string; name: string; latitude: number; longitude: number; timezone: string }[]> {
  const response = await fetch(`${apiBase()}/api/geocode?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("geocode");
  const body = (await response.json()) as { results?: { id: string; name: string; latitude: number; longitude: number; timezone: string }[] };
  return body.results ?? [];
}

export async function fetchWeather(lat: number, lon: number, tz: string): Promise<{ hours: unknown[]; cached?: boolean; offline?: boolean }> {
  const key = `${lat.toFixed(2)}|${lon.toFixed(2)}|${tz}`;
  try {
    const response = await fetch(`${apiBase()}/api/weather?lat=${lat}&lon=${lon}&tz=${encodeURIComponent(tz)}`);
    if (!response.ok) throw new Error("weather");
    const body = (await response.json()) as { hours: unknown[]; cached?: boolean };
    await cacheWeather(key, body);
    return body;
  } catch {
    const cached = (await readWeatherCache(key)) as { hours: unknown[] } | null;
    if (cached) return { ...cached, offline: true };
    throw new Error("weather");
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  if (typeof globalThis.btoa === "function") return globalThis.btoa(binary);
  // Fallback for environments without btoa.
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let i = 0; i < binary.length; i += 3) {
    const a = binary.charCodeAt(i);
    const b = i + 1 < binary.length ? binary.charCodeAt(i + 1) : 0;
    const c = i + 2 < binary.length ? binary.charCodeAt(i + 2) : 0;
    const n = (a << 16) | (b << 8) | c;
    output += chars[(n >> 18) & 63]! + chars[(n >> 12) & 63]!;
    output += i + 1 < binary.length ? chars[(n >> 6) & 63]! : "=";
    output += i + 2 < binary.length ? chars[n & 63]! : "=";
  }
  return output;
}

export async function fetchSkyPlate(params: {
  ra: number;
  dec: number;
  fov: number;
  size: number;
}): Promise<{ uri: string; source: string | null; offline?: boolean }> {
  const query = new URLSearchParams({
    ra: params.ra.toFixed(5),
    dec: params.dec.toFixed(5),
    fov: params.fov.toFixed(4),
    size: String(params.size),
  }).toString();
  const cacheKey = query;
  try {
    const response = await fetch(`${apiBase()}/api/sky?${query}`);
    if (!response.ok) throw new Error("sky");
    const source = response.headers.get("x-sky-source");
    const buffer = await response.arrayBuffer();
    const uri = `data:image/jpeg;base64,${arrayBufferToBase64(buffer)}`;
    await cachePlate(cacheKey, uri);
    return { uri, source };
  } catch {
    const cached = await readPlateCache(cacheKey);
    if (cached) return { uri: cached, source: "cache", offline: true };
    throw new Error("sky");
  }
}
