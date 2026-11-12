export type ForecastHour = {
  /** Local civil time from Open-Meteo, `YYYY-MM-DDTHH:mm`. */
  time: string;
  cloud: number;
  cloudLow: number;
  cloudMid: number;
  cloudHigh: number;
  precipitation: number;
  windKmh: number;
  temperatureC: number;
};

export type SkyCover = "clear" | "broken" | "cloudy" | "overcast";

export type ForecastSummary = {
  hours: ForecastHour[];
  meanCloud: number;
  best: ForecastHour | null;
  cover: SkyCover;
};

export function parseOpenMeteo(payload: unknown): ForecastHour[] {
  if (!payload || typeof payload !== "object") return [];
  const hourly = (payload as { hourly?: unknown }).hourly;
  if (!hourly || typeof hourly !== "object") return [];
  const table = hourly as Record<string, unknown>;
  const times = stringArray(table.time);
  const hours: ForecastHour[] = [];
  for (let index = 0; index < times.length; index += 1) {
    const time = times[index];
    if (!time) continue;
    const cloud = numberAt(table.cloud_cover, index);
    const cloudLow = numberAt(table.cloud_cover_low, index);
    const cloudMid = numberAt(table.cloud_cover_mid, index);
    const cloudHigh = numberAt(table.cloud_cover_high, index);
    const precipitation = numberAt(table.precipitation_probability, index);
    const wind = numberAt(table.wind_speed_10m, index);
    const temperature = numberAt(table.temperature_2m, index);
    if (
      cloud == null ||
      cloudLow == null ||
      cloudMid == null ||
      cloudHigh == null ||
      precipitation == null ||
      wind == null ||
      temperature == null
    ) {
      continue;
    }
    hours.push({
      time,
      cloud,
      cloudLow,
      cloudMid,
      cloudHigh,
      precipitation,
      windKmh: wind,
      temperatureC: temperature,
    });
  }
  return hours;
}

export function hoursBetween(hours: ForecastHour[], start: string, end: string): ForecastHour[] {
  return hours.filter((hour) => hour.time >= start && hour.time <= end);
}

export function summarizeForecast(hours: ForecastHour[]): ForecastSummary {
  if (hours.length === 0) {
    return { hours, meanCloud: 0, best: null, cover: "overcast" };
  }
  const meanCloud = hours.reduce((sum, hour) => sum + hour.cloud, 0) / hours.length;
  const best = hours.reduce((lowest, hour) => (hour.cloud < lowest.cloud ? hour : lowest));
  return { hours, meanCloud, best, cover: skyCover(meanCloud) };
}

export function skyCover(meanCloud: number): SkyCover {
  if (meanCloud < 25) return "clear";
  if (meanCloud < 50) return "broken";
  if (meanCloud < 80) return "cloudy";
  return "overcast";
}

export function skyCoverLabel(cover: SkyCover): string {
  switch (cover) {
    case "clear":
      return "Mostly clear";
    case "broken":
      return "Broken cloud";
    case "cloudy":
      return "Mostly cloudy";
    case "overcast":
      return "Overcast";
    default: {
      const exhaustive: never = cover;
      return exhaustive;
    }
  }
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function numberAt(value: unknown, index: number): number | null {
  if (!Array.isArray(value)) return null;
  const item = value[index];
  return typeof item === "number" && Number.isFinite(item) ? item : null;
}
