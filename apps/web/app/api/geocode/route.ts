import { isValidTimeZone, type Site } from "@dss/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeocodeResult = {
  name?: string;
  admin1?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 80) return Response.json({ results: [] });

  const endpoint = new URL("https://geocoding-api.open-meteo.com/v1/search");
  endpoint.searchParams.set("name", query);
  endpoint.searchParams.set("count", "6");
  endpoint.searchParams.set("language", "en");
  endpoint.searchParams.set("format", "json");

  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return Response.json({ error: "The place search did not answer." }, { status: 502 });
    const body = (await response.json()) as { results?: GeocodeResult[] };
    const results = (body.results ?? [])
      .map((item) => toPlace(item))
      .filter((item): item is Site => item != null);
    return Response.json({ results });
  } catch {
    return Response.json({ error: "The place search failed." }, { status: 502 });
  }
}

function toPlace(item: GeocodeResult): Site | null {
  if (typeof item.name !== "string") return null;
  if (item.latitude == null || item.longitude == null) return null;
  if (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) return null;
  const timezone = item.timezone && isValidTimeZone(item.timezone) ? item.timezone : "UTC";
  const region = [item.admin1, item.country].filter(Boolean).join(", ");
  return {
    id: "custom",
    name: region ? `${item.name}, ${region}` : item.name,
    latitude: item.latitude,
    longitude: item.longitude,
    timezone,
  };
}
