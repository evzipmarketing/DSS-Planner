import { describe, expect, it } from "vitest";
import { angularSeparationDeg, equatorialUnit } from "../src/altitude";
import {
  bandAdvice,
  compareTargetPriority,
  frameFillPercent,
  frameFit,
  moonPlan,
  passesListFilter,
} from "../src/planning";
import { suggestExposure } from "../src/integration";
import type { ImagingFilter } from "../src/types";

const luminance: ImagingFilter = {
  id: "l",
  name: "L",
  kind: "luminance",
  bandpassNm: 200,
  transmission: 0.9,
};

describe("frame fill", () => {
  const field = { widthArcmin: 120, heightArcmin: 80 };

  it("compares the major axis with the shorter side of the field", () => {
    expect(frameFillPercent(40, field)).toBeCloseTo(50, 5);
    expect(frameFit(50)).toBe("good");
    expect(frameFit(8)).toBe("small");
    expect(frameFit(85)).toBe("tight");
    expect(frameFit(120)).toBe("large");
    expect(frameFit(null)).toBe("unknown");
    expect(frameFillPercent(null, field)).toBeNull();
  });
});

describe("moon separation and priority", () => {
  it("measures a right angle between equatorial vectors", () => {
    const north = equatorialUnit(0, 90);
    const equator = equatorialUnit(0, 0);
    expect(angularSeparationDeg(north, equator)).toBeCloseTo(90, 5);
    expect(angularSeparationDeg(equator, equator)).toBeCloseTo(0, 5);
  });

  it("tags emission nebulae, planetaries, galaxies, and clusters", () => {
    expect(bandAdvice("HII")).toBe("narrowband");
    expect(bandAdvice("SNR")).toBe("narrowband");
    expect(bandAdvice("PN")).toBe("both");
    expect(bandAdvice("G")).toBe("broadband");
    expect(bandAdvice("RfN")).toBe("broadband");
    expect(bandAdvice("DrkN")).toBe("broadband");
    expect(bandAdvice("OCl")).toBe("broadband");
  });

  it("penalises a bright nearby Moon and prefers narrowband when the Moon is far", () => {
    const thin = moonPlan({ band: "broadband", illuminatedFraction: 0.1, moonUp: true, minSeparationDeg: 20 });
    const close = moonPlan({ band: "broadband", illuminatedFraction: 0.8, moonUp: true, minSeparationDeg: 18 });
    const farBroad = moonPlan({ band: "broadband", illuminatedFraction: 0.8, moonUp: true, minSeparationDeg: 70 });
    const farNarrow = moonPlan({ band: "narrowband", illuminatedFraction: 0.8, moonUp: true, minSeparationDeg: 70 });
    expect(thin.hint).toBeNull();
    expect(thin.score).toBeGreaterThan(close.score);
    expect(close.hint).toMatch(/close/i);
    expect(farBroad.hint).toMatch(/broadband not recommended/);
    expect(farNarrow.score).toBeGreaterThan(farBroad.score);
    expect(farNarrow.hint).toBeNull();
  });

  it("sorts a good frame first, then time above the horizon, then the Moon score", () => {
    const goodShort = { frameFit: "good" as const, hoursAboveHorizon: 2, moonScore: 0.2 };
    const smallLong = { frameFit: "small" as const, hoursAboveHorizon: 10, moonScore: 1 };
    const goodLongDim = { frameFit: "good" as const, hoursAboveHorizon: 6, moonScore: 0.3 };
    const goodLongBright = { frameFit: "good" as const, hoursAboveHorizon: 6, moonScore: 0.9 };
    const ordered = [smallLong, goodShort, goodLongDim, goodLongBright].sort(compareTargetPriority);
    expect(ordered.map((item) => item.moonScore)).toEqual([0.9, 0.3, 0.2, 1]);
    expect(passesListFilter(
      { band: "narrowband", frameFit: "good", moonHint: null, moonScore: 0.9, objectType: "HII" },
      "moon-safe",
    )).toBe(true);
    expect(passesListFilter(
      { band: "broadband", frameFit: "good", moonHint: "Moon bright — broadband not recommended", moonScore: 0.3, objectType: "G" },
      "moon-safe",
    )).toBe(false);
    expect(passesListFilter(
      { band: "narrowband", frameFit: "small", moonHint: null, moonScore: 1, objectType: "SNR" },
      "good-fit",
    )).toBe(false);
  });

  it("lengthens a broadband stack when the Moon is bright and caps it at the usable window", () => {
    const dark = suggestExposure({
      filter: luminance,
      bortle: 4,
      apertureMm: 72,
      focalLengthMm: 420,
      pixelScaleArcsec: 1.8,
      readNoiseE: 1.5,
      moonIlluminatedFraction: 0.05,
      moonAltitudeDeg: -20,
      usableHours: 4,
    });
    const moonlit = suggestExposure({
      filter: luminance,
      bortle: 4,
      apertureMm: 72,
      focalLengthMm: 420,
      pixelScaleArcsec: 1.8,
      readNoiseE: 1.5,
      moonIlluminatedFraction: 0.9,
      moonSeparationDeg: 80,
      moonAltitudeDeg: 40,
      usableHours: 2,
    });
    expect(moonlit.totalHours).toBeGreaterThan(dark.totalHours);
    expect(moonlit.tonightHours).toBeLessThanOrEqual(2);
    expect(moonlit.explanation).toMatch(/usable time/i);
  });
});
