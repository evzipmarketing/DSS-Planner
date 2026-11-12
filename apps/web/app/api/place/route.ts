import { isValidTimeZone } from "@dss/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CacheEntry = { at: number; name: string; timezone: string };
const cache = new Map<string, CacheEntry>();
const HOUR = 60 * 60 * 1000;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return Response.json({ error: "Latitude is out of range." }, { status: 400 });
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return Response.json({ error: "Longitude is out of range." }, { status: 400 });
  }

  const key = `${latitude.toFixed(2)}|${longitude.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < HOUR) {
    return Response.json({ name: hit.name, latitude, longitude, timezone: hit.timezone });
  }

  const timezone = await timezoneFromMeteo(latitude, longitude);
  const name = (await nameFromNominatim(latitude, longitude)) ?? `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
  cache.set(key, { at: Date.now(), name, timezone });
  return Response.json({ name, latitude, longitude, timezone });
}

async function timezoneFromMeteo(latitude: number, longitude: number): Promise<string> {
  const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
  endpoint.searchParams.set("latitude", latitude.toFixed(4));
  endpoint.searchParams.set("longitude", longitude.toFixed(4));
  endpoint.searchParams.set("current", "temperature_2m");
  endpoint.searchParams.set("timezone", "auto");
  endpoint.searchParams.set("forecast_days", "1");
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return "UTC";
    const body = (await response.json()) as { timezone?: string };
    return body.timezone && isValidTimeZone(body.timezone) ? body.timezone : "UTC";
  } catch {
    return "UTC";
  }
}

async function nameFromNominatim(latitude: number, longitude: number): Promise<string | null> {
  const endpoint = new URL("https://nominatim.openstreetmap.org/reverse");
  endpoint.searchParams.set("lat", String(latitude));
  endpoint.searchParams.set("lon", String(longitude));
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("zoom", "10");
  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(8000),
      headers: {
        accept: "application/json",
        "accept-language": "en",
        "user-agent": "DSS-Planner/0.1 (astrophotography session planner)",
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { address?: Record<string, string>; display_name?: string };
    const address = body.address ?? {};
    const place = address.city || address.town || address.village || address.hamlet || address.county || address.state;
    const country = address.country;
    if (place && country) return `${place}, ${country}`;
    if (place) return place;
    return body.display_name?.split(",").slice(0, 2).join(",").trim() || null;
  } catch {
    return null;
  }
}
