import { describe, expect, it } from "vitest";
import {
  ASTRONOMICAL_SUN_ALTITUDE_DEG,
  IMAGEABLE_MIN_ALTITUDE_DEG,
  ang2pixNest,
  assumedSeeingArcsec,
  buildNightTrack,
  centerAfterSensorDrag,
  chooseHipsOrder,
  civilDate,
  equatorialToPixel,
  fieldOfView,
  formatCatalogueId,
  formatDeclination,
  formatRightAscension,
  hipsPixelScaleDeg,
  hipsTilePixel,
  isNarrowband,
  isShortlistCandidate,
  moonPhaseName,
  parseCatalogue,
  parseOpenMeteo,
  pixelScaleArcsec,
  pixelToEquatorial,
  rankTargets,
  samplingAdvice,
  searchCatalogue,
  sensorDisagreement,
  skyElectronsPerSecond,
  suggestExposure,
  suggestedTotalHours,
  summarizeForecast,
  UnconfiguredPanchangClient,
  zonedDateTimeToUtc,
  type Camera,
  type DeepSkyObject,
  type ImagingFilter,
  type Site,
} from "../src/index";

const HYDERABAD: Site = {
  id: "hyderabad",
  name: "Hyderabad",
  latitude: 17.385,
  longitude: 78.4867,
  timezone: "Asia/Kolkata",
};

const M42: DeepSkyObject = {
  id: "NGC1976",
  type: "Cl+N",
  raDeg: 83.81867,
  decDeg: -5.38967,
  constellation: "Ori",
  majorArcmin: 90,
  minorArcmin: 60,
  positionAngleDeg: null,
  magnitude: 4,
  messier: 42,
  names: ["Great Orion Nebula", "Orion Nebula"],
  opacity: null,
  aliases: ["NGC1976", "M42", "LBN974", "Sh2-281"],
  catalogues: ["ngc", "messier", "lbn", "sharpless"],
  note: null,
};

const ANDROMEDA: DeepSkyObject = {
  ...M42,
  id: "NGC224",
  type: "G",
  raDeg: 10.68479,
  decDeg: 41.26906,
  constellation: "And",
  majorArcmin: 178,
  minorArcmin: 70,
  positionAngleDeg: 35,
  magnitude: 3.44,
  messier: 31,
  names: ["Andromeda Galaxy"],
  aliases: ["NGC224", "M31"],
  catalogues: ["ngc", "messier"],
};

const camera: Camera = {
  id: "test-cam",
  name: "Test 533",
  sensorWidthMm: 11.31,
  sensorHeightMm: 11.31,
  pixelSizeUm: 3.76,
  widthPx: 3008,
  heightPx: 3008,
  sensor: "colour",
  readNoiseE: 1.1,
};

const luminance: ImagingFilter = {
  id: "l",
  name: "L",
  kind: "luminance",
  bandpassNm: 260,
  transmission: 0.95,
};

const ha: ImagingFilter = {
  id: "ha",
  name: "Ha",
  kind: "ha",
  bandpassNm: 6,
  transmission: 0.9,
};

describe("coordinates and time", () => {
  it("formats J2000 sexagesimal", () => {
    expect(formatRightAscension(83.81867)).toBe("05h 35m 16s");
    expect(formatDeclination(-5.38967)).toBe("−05° 23′ 23″");
    expect(formatCatalogueId("NGC0224")).toBe("NGC 224");
    expect(formatCatalogueId("LDN0001")).toBe("LDN 1");
    expect(formatCatalogueId("Mel022")).toBe("Mel 22");
    expect(formatCatalogueId("Sh2-281")).toBe("Sh2-281");
  });

  it("converts Asia/Kolkata and a daylight-time zone", () => {
    const kolkata = zonedDateTimeToUtc(2026, 1, 15, 18, 30, "Asia/Kolkata");
    expect(kolkata.toISOString()).toBe("2026-01-15T13:00:00.000Z");
    const summer = zonedDateTimeToUtc(2026, 7, 1, 12, 0, "America/New_York");
    expect(summer.toISOString()).toBe("2026-07-01T16:00:00.000Z");
    const winter = zonedDateTimeToUtc(2026, 1, 15, 12, 0, "America/New_York");
    expect(winter.toISOString()).toBe("2026-01-15T17:00:00.000Z");
  });

  it("names today in a zone from a fixed instant", () => {
    expect(civilDate("Asia/Kolkata", new Date("2026-01-14T20:00:00.000Z"))).toBe("2026-01-15");
  });
});

describe("optics", () => {
  it("computes image scale and field", () => {
    const scale = pixelScaleArcsec(3.76, 420);
    expect(scale).toBeCloseTo((3.76 / 420) * 206.265, 6);
    const fov = fieldOfView(camera, 420);
    const expected = 2 * Math.atan(11.31 / (2 * 420)) * (180 / Math.PI);
    expect(fov.widthDeg).toBeCloseTo(expected, 6);
    expect(fov.heightDeg).toBeCloseTo(expected, 6);
  });

  it("classifies sampling against the Bortle seeing assumption", () => {
    expect(assumedSeeingArcsec(4)).toBeCloseTo(2.2, 5);
    expect(samplingAdvice(1.2, 4).kind).toBe("balanced");
    expect(samplingAdvice(3.2, 4).kind).toBe("undersampled");
    expect(samplingAdvice(0.4, 4).kind).toBe("oversampled");
  });

  it("flags a sensor whose pixel size and width disagree", () => {
    const mismatch = sensorDisagreement({ ...camera, sensorWidthMm: 20 });
    expect(mismatch?.axis).toBe("width");
    expect(sensorDisagreement(camera)).toBeNull();
  });
});

describe("exposure heuristic", () => {
  const base = {
    bortle: 4,
    apertureMm: 72,
    pixelScaleArcsec: 1.8,
    transmission: 0.9,
  };

  it("shortens subs and lengthens the stack as the sky brightens", () => {
    const dark = skyElectronsPerSecond({ ...base, bandpassNm: 100 });
    const bright = skyElectronsPerSecond({ ...base, bortle: 8, bandpassNm: 100 });
    expect(bright).toBeGreaterThan(dark);
    const darkSub = suggestExposure({
      filter: luminance,
      bortle: 3,
      apertureMm: 72,
      focalLengthMm: 420,
      pixelScaleArcsec: 1.8,
      readNoiseE: 1.5,
    });
    const citySub = suggestExposure({
      filter: luminance,
      bortle: 8,
      apertureMm: 72,
      focalLengthMm: 420,
      pixelScaleArcsec: 1.8,
      readNoiseE: 1.5,
    });
    expect(citySub.subExposureSeconds).toBeLessThan(darkSub.subExposureSeconds);
    expect(citySub.totalHours).toBeGreaterThan(darkSub.totalHours);
  });

  it("gives narrowband a longer sub and a slower rig a longer total", () => {
    const wide = skyElectronsPerSecond({ ...base, bandpassNm: 200 });
    const narrow = skyElectronsPerSecond({ ...base, bandpassNm: 6 });
    expect(narrow).toBeLessThan(wide);
    const coarse = suggestExposure({
      filter: ha,
      bortle: 5,
      apertureMm: 80,
      focalLengthMm: 400,
      pixelScaleArcsec: 2.4,
      readNoiseE: 1.5,
    });
    const fine = suggestExposure({
      filter: ha,
      bortle: 5,
      apertureMm: 80,
      focalLengthMm: 400,
      pixelScaleArcsec: 0.8,
      readNoiseE: 1.5,
    });
    expect(fine.subExposureSeconds).toBeGreaterThan(coarse.subExposureSeconds);
    expect(suggestedTotalHours("luminance", 4, 8)).toBeGreaterThan(suggestedTotalHours("luminance", 4, 4));
    expect(isNarrowband("ha")).toBe(true);
    expect(isNarrowband("broadband")).toBe(false);
  });
});

describe("gnomonic frame", () => {
  const projection = { raDeg: 80, decDeg: 10, fovDeg: 2, widthPx: 400, heightPx: 200 };

  it("keeps east on the left and north up", () => {
    const center = equatorialToPixel(projection, 80, 10);
    expect(center.x).toBeCloseTo(200, 4);
    expect(center.y).toBeCloseTo(100, 4);
    const east = equatorialToPixel(projection, 80.2, 10);
    const north = equatorialToPixel(projection, 80, 10.2);
    expect(east.x).toBeLessThan(center.x);
    expect(north.y).toBeLessThan(center.y);
  });

  it("round-trips a pixel and treats a rightward drag as a westward centre", () => {
    const back = pixelToEquatorial(projection, 240, 70);
    const again = equatorialToPixel(projection, back.raDeg, back.decDeg);
    expect(again.x).toBeCloseTo(240, 3);
    expect(again.y).toBeCloseTo(70, 3);
    const dragged = centerAfterSensorDrag(projection, 30, 0);
    expect(dragged.raDeg).toBeLessThan(projection.raDeg);
  });
});

describe("healpix", () => {
  const fixtures = [
    { nside: 1, ra: 0, dec: 0, ipix: 4 },
    { nside: 1, ra: 180, dec: 0, ipix: 6 },
    { nside: 1, ra: 90, dec: 45, ipix: 1 },
    { nside: 1, ra: 0, dec: 89, ipix: 0 },
    { nside: 1, ra: 10, dec: -89, ipix: 8 },
    { nside: 4, ra: 83.822083, dec: -5.391111, ipix: 83 },
    { nside: 32, ra: 10.684708, dec: 41.269065, ipix: 677 },
    { nside: 512, ra: 279.234735, dec: 38.783689, ipix: 954011 },
    { nside: 32768, ra: 101.287155, dec: -16.716116, ipix: 5489309474 },
    { nside: 32768, ra: 279.234735, dec: 38.783689, ipix: 3907631802 },
  ];

  it("matches healpy nested indexes", () => {
    for (const fixture of fixtures) {
      expect(ang2pixNest(fixture.nside, fixture.ra, fixture.dec)).toBe(fixture.ipix);
    }
  });

  it("places Vega on the calibrated DSS tile pixel", () => {
    expect(hipsTilePixel(279.234735, 38.783689, 6)).toEqual({ tile: 14906, x: 255, y: 324 });
    expect(chooseHipsOrder(0.001875)).toBeLessThanOrEqual(7);
    expect(hipsPixelScaleDeg(9)).toBeCloseTo(2.236e-4, 8);
  });
});

describe("catalogue search", () => {
  const cloud: DeepSkyObject = {
    ...M42,
    id: "LDN1",
    type: "DrkN",
    names: [],
    messier: null,
    magnitude: null,
    aliases: ["LDN1"],
    catalogues: ["ldn"],
    opacity: 3,
  };
  const objects = [M42, ANDROMEDA, cloud];

  it("finds Messier numbers, NGC ids, cross-ids, and common names", () => {
    expect(searchCatalogue(objects, "m42")[0]?.id).toBe("NGC1976");
    expect(searchCatalogue(objects, "Messier 31")[0]?.id).toBe("NGC224");
    expect(searchCatalogue(objects, "ngc 224")[0]?.id).toBe("NGC224");
    expect(searchCatalogue(objects, "orion nebula")[0]?.id).toBe("NGC1976");
    expect(searchCatalogue(objects, "sh2-281")[0]?.id).toBe("NGC1976");
    expect(searchCatalogue(objects, "lbn 974")[0]?.id).toBe("NGC1976");
    expect(searchCatalogue(objects, "ldn 1")[0]?.id).toBe("LDN1");
  });

  it("parses a compact row and keeps anonymous Lynds clouds off the shortlist", () => {
    const parsed = parseCatalogue([
      ["NGC1976", "Cl+N", 83.82, -5.39, "Ori", 90, 60, null, 4, "Orion Nebula", null, "NGC1976|M42|Sh2-281", null],
    ]);
    expect(parsed[0]?.names).toEqual(["Orion Nebula"]);
    expect(parsed[0]?.messier).toBe(42);
    expect(parsed[0]?.catalogues).toContain("sharpless");
    expect(isShortlistCandidate(M42)).toBe(true);
    expect(isShortlistCandidate(cloud)).toBe(false);
  });
});

describe("night track and shortlist", () => {
  it("puts the Orion Nebula high on a January night from Hyderabad", () => {
    const track = buildNightTrack({
      raDeg: M42.raDeg,
      decDeg: M42.decDeg,
      site: HYDERABAD,
      dateIso: "2026-01-15",
      stepMinutes: 10,
    });
    const geometric = 90 - Math.abs(HYDERABAD.latitude - M42.decDeg);
    expect(track.maxTargetAltitude).toBeGreaterThan(60);
    expect(track.maxTargetAltitude).toBeCloseTo(geometric, 0);
    expect(IMAGEABLE_MIN_ALTITUDE_DEG).toBe(20);
    expect(track.usableHours).toBeGreaterThan(1);
    const dark = track.samples.filter((sample) => sample.sunAltitude <= ASTRONOMICAL_SUN_ALTITUDE_DEG);
    expect(dark.filter((sample) => sample.targetAltitude >= IMAGEABLE_MIN_ALTITUDE_DEG).every((sample) => sample.usable)).toBe(true);
    expect(dark.filter((sample) => sample.targetAltitude < IMAGEABLE_MIN_ALTITUDE_DEG).every((sample) => !sample.usable)).toBe(true);
    expect(track.samples.some((sample) => sample.sunAltitude < ASTRONOMICAL_SUN_ALTITUDE_DEG)).toBe(true);
    expect(moonPhaseName(0)).toBe("New");
    expect(moonPhaseName(180)).toBe("Full");
  });

  it("does not rank an object that stays below the horizon", () => {
    const sunk: DeepSkyObject = {
      ...M42,
      id: "SOUTH",
      decDeg: -80,
      names: ["Far south"],
      messier: null,
      magnitude: 4,
      aliases: ["SOUTH"],
      catalogues: [],
    };
    const ranked = rankTargets([M42, sunk], HYDERABAD, "2026-01-15", 5);
    expect(ranked.some((item) => item.object.id === "SOUTH")).toBe(false);
    expect(ranked.some((item) => item.object.id === "NGC1976")).toBe(true);
  });
});

describe("weather and panchang", () => {
  it("parses an Open-Meteo hourly block and summarises the night", () => {
    const hours = parseOpenMeteo({
      hourly: {
        time: ["2026-11-12T22:00", "2026-11-12T23:00"],
        cloud_cover: [10, 40],
        cloud_cover_low: [5, 20],
        cloud_cover_mid: [5, 10],
        cloud_cover_high: [0, 10],
        precipitation_probability: [0, 15],
        wind_speed_10m: [8, 12],
        temperature_2m: [22, 21],
      },
    });
    const summary = summarizeForecast(hours);
    expect(summary.meanCloud).toBe(25);
    expect(summary.best?.time).toBe("2026-11-12T22:00");
    expect(summary.cover).toBe("broken");
  });

  it("refuses to invent a panchang", async () => {
    const client = new UnconfiguredPanchangClient();
    await expect(
      client.getDay({
        dateIso: "2026-11-12",
        latitudeDeg: 17.385,
        longitudeDeg: 78.4867,
        timeZone: "Asia/Kolkata",
      }),
    ).rejects.toThrow(/not configured/);
  });
});
