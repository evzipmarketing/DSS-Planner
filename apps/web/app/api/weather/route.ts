import { parseOpenMeteo, type ForecastHour } from "@dss/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CacheEntry = { at: number; hours: ForecastHour[] };

const cache = new Map<string, CacheEntry>();
const TEN_MINUTES = 10 * 60 * 1000;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));
  const timeZone = url.searchParams.get("tz") ?? "";
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return Response.json({ error: "Latitude is out of range." }, { status: 400 });
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return Response.json({ error: "Longitude is out of range." }, { status: 400 });
  }
  if (!isZone(timeZone)) {
    return Response.json({ error: "Timezone is not recognised." }, { status: 400 });
  }

  const key = `${latitude.toFixed(2)}|${longitude.toFixed(2)}|${timeZone}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TEN_MINUTES) {
    return Response.json({ hours: hit.hours, cached: true }, { headers: cacheHeaders() });
  }

  const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
  endpoint.searchParams.set("latitude", latitude.toFixed(4));
  endpoint.searchParams.set("longitude", longitude.toFixed(4));
  endpoint.searchParams.set(
    "hourly",
    "cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation_probability,wind_speed_10m,temperature_2m",
  );
  endpoint.searchParams.set("timezone", timeZone);
  endpoint.searchParams.set("forecast_days", "7");
  endpoint.searchParams.set("wind_speed_unit", "kmh");

  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) {
      return Response.json({ error: "Open-Meteo did not answer." }, { status: 502 });
    }
    const hours = parseOpenMeteo(await response.json());
    cache.set(key, { at: Date.now(), hours });
    return Response.json({ hours, cached: false }, { headers: cacheHeaders() });
  } catch {
    return Response.json({ error: "Weather request failed." }, { status: 502 });
  }
}

function cacheHeaders(): HeadersInit {
  return { "cache-control": "public, max-age=600" };
}

function isZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
