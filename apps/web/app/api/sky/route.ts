import { renderSkyPlate } from "@/lib/plate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const raDeg = readNumber(url, "ra", 0, 360);
  const decDeg = readNumber(url, "dec", -90, 90);
  const fovDeg = readNumber(url, "fov", 0.05, 20);
  const sizeRaw = readNumber(url, "size", 256, 640);
  if (raDeg == null || decDeg == null || fovDeg == null || sizeRaw == null) {
    return Response.json({ error: "Invalid plate request." }, { status: 400 });
  }
  const size = Math.round(sizeRaw);

  try {
    const plate = await renderSkyPlate({ raDeg, decDeg, fovDeg, size });
    return new Response(Buffer.from(plate.bytes), {
      headers: {
        "content-type": "image/jpeg",
        "x-sky-source": plate.source,
        "cache-control": "public, max-age=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sky plate failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}

function readNumber(url: URL, key: string, min: number, max: number): number | null {
  const value = Number(url.searchParams.get(key));
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}
