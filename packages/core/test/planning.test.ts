import { describe, expect, it } from "vitest";
import { angularSeparationDeg, equatorialUnit } from "../src/altitude";
import {
  bandAdvice,
  compareTargetPriority,
  compareTargetSort,
  frameFillPercent,
  frameFit,
  horizonStory,
  imageableCrossing,
  moonPlan,
  passesListFilter,
  visibilityScore,
  type TargetSortFields,
} from "../src/planning";
import { exposureClass, suggestExposure } from "../src/integration";
import { primaryDesignation } from "../src/catalogue";
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

  it("sorts by fit and brightness, and demotes a window under an hour", () => {
    const goodNone = { frameFit: "good" as const, usableHours: 0, moonScore: 1, visibility: 0.9 };
    const faintGood = { frameFit: "good" as const, usableHours: 6, moonScore: 0.9, visibility: 0.15 };
    const brightGood = { frameFit: "good" as const, usableHours: 4, moonScore: 0.3, visibility: 0.9 };
    const brightSmall = { frameFit: "small" as const, usableHours: 6, moonScore: 1, visibility: 0.9 };
    const ordered = [goodNone, faintGood, brightSmall, brightGood].sort(compareTargetPriority);
    expect(ordered.map((item) => item.visibility)).toEqual([0.9, 0.15, 0.9, 0.9]);
    expect(ordered[0]?.usableHours).toBe(4);
    expect(ordered[3]?.usableHours).toBe(0);
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
    expect(moonlit.explanation).toMatch(/imageable time/i);
  });

  it("does not treat the start of the window as a rise", () => {
    const noon = new Date("2026-11-12T06:30:00Z");
    const later = new Date("2026-11-12T14:00:00Z");
    const alreadyUp = horizonStory([
      { time: noon, altitude: 40 },
      { time: later, altitude: -5 },
    ]);
    expect(alreadyUp.upAtStart).toBe(true);
    expect(alreadyUp.rise).toBeNull();
    expect(alreadyUp.set).toEqual(later);
    expect(alreadyUp.circumpolar).toBe(false);
    const circumpolar = horizonStory([
      { time: noon, altitude: 20 },
      { time: later, altitude: 50 },
    ]);
    expect(circumpolar.circumpolar).toBe(true);
    expect(circumpolar.rise).toBeNull();
  });

  it("prefers Messier over Sharpless for the displayed id", () => {
    expect(
      primaryDesignation({
        id: "NGC1976",
        type: "Cl+N",
        raDeg: 83.8,
        decDeg: -5.4,
        constellation: "Ori",
        majorArcmin: 90,
        minorArcmin: 60,
        positionAngleDeg: null,
        magnitude: 4,
        messier: 42,
        names: ["Great Orion Nebula"],
        opacity: null,
        aliases: ["NGC1976", "Sh2-281", "LBN974", "M42"],
        catalogues: ["messier", "ngc", "sharpless"],
        note: null,
      }),
    ).toBe("M42");
    expect(exposureClass(4)).toBe("bright");
    expect(exposureClass(7)).toBe("medium");
    expect(exposureClass(11)).toBe("faint");
  });

  it("keeps an M42 broadband plan inside community bounds at Bortle 9", () => {
    const plan = suggestExposure({
      filter: {
        id: "l2",
        name: "L-2 UV/IR cut",
        kind: "uv_ir_cut",
        bandpassNm: 320,
        transmission: 0.97,
      },
      bortle: 9,
      apertureMm: 72,
      focalLengthMm: 420,
      pixelScaleArcsec: 1.85,
      readNoiseE: 1.2,
      magnitude: 4,
      moonIlluminatedFraction: 0.1,
      moonAltitudeDeg: -30,
    });
    expect(plan.totalHours).toBeGreaterThanOrEqual(1.5);
    expect(plan.totalHours).toBeLessThanOrEqual(6);
    expect(plan.subExposureSeconds).toBeGreaterThanOrEqual(30);
    expect(plan.subExposureSeconds).toBeLessThanOrEqual(180);
    expect(plan.explanation).toMatch(/bright target/i);
  });

  it("hides a dark nebula under a bright sky and keeps a bright emission nebula visible", () => {
    const shape = {
      majorArcmin: 30,
      minorArcmin: 20,
      messier: null,
      aliases: [] as string[],
    };
    const orion = visibilityScore(
      { ...shape, type: "Cl+N", id: "NGC1976", magnitude: 4, messier: 42, aliases: ["M42"] },
      9,
    );
    const dark = visibilityScore(
      { ...shape, type: "DrkN", id: "LDN123", magnitude: null, aliases: ["LDN123"] },
      9,
    );
    const faint = visibilityScore({ ...shape, type: "Neb", id: "LBN546", magnitude: null, aliases: ["LBN546"] }, 9);
    expect(orion).toBeGreaterThan(faint);
    expect(orion).toBeGreaterThan(dark * 3);
  });
});

function sorted(items: TargetSortFields[], key: "recommended" | "frame" | "imageable" | "rise", direction: "asc" | "desc") {
  return [...items].sort((a, b) => compareTargetSort(a, b, key, direction)).map((item) => item.id);
}

function target(partial: Partial<TargetSortFields> & Pick<TargetSortFields, "id">): TargetSortFields {
  return {
    frameFit: "good",
    usableHours: 4,
    moonScore: 0.5,
    visibility: 0.5,
    frameFillPercent: 20,
    imageableAtDusk: false,
    imageableRise: null,
    ...partial,
  };
}

describe("target list sort", () => {
  const dusk = new Date("2026-11-13T16:30:00Z");
  const early = new Date("2026-11-13T17:00:00Z");
  const late = new Date("2026-11-13T20:00:00Z");
  const items = [
    target({ id: "up", imageableAtDusk: true, usableHours: 8, frameFillPercent: 10, visibility: 0.2 }),
    target({ id: "early", imageableRise: early, usableHours: 5, frameFillPercent: 40, visibility: 0.9 }),
    target({ id: "late", imageableRise: late, usableHours: 2, frameFillPercent: 70, visibility: 0.4 }),
    target({ id: "never", usableHours: 0, frameFillPercent: null, visibility: 0.1, frameFit: "unknown" }),
  ];

  it("keeps the recommended ranking, with the best target first when descending", () => {
    const recommended = [...items].sort(compareTargetPriority).map((item) => item.id);
    expect(sorted(items, "recommended", "desc")).toEqual(recommended);
    expect(sorted(items, "recommended", "asc")).toEqual([...recommended].reverse());
  });

  it("sorts frame fill in either direction and leaves an unknown size last", () => {
    expect(sorted(items, "frame", "desc")).toEqual(["late", "early", "up", "never"]);
    expect(sorted(items, "frame", "asc")).toEqual(["up", "early", "late", "never"]);
  });

  it("sorts imageable hours in either direction", () => {
    expect(sorted(items, "imageable", "desc")).toEqual(["up", "early", "late", "never"]);
    expect(sorted(items, "imageable", "asc")).toEqual(["never", "late", "early", "up"]);
  });

  it("sorts rise time with targets already up at dusk first when ascending, and targets that never rise last", () => {
    expect(sorted(items, "rise", "asc")).toEqual(["up", "early", "late", "never"]);
    expect(sorted(items, "rise", "desc")).toEqual(["late", "early", "up", "never"]);
  });

  it("marks a target already above 20° at dusk, a later climb, and a target that never reaches 20°", () => {
    const night = [
      { time: new Date("2026-11-13T12:00:00Z"), altitude: 5, sunAltitude: 10 },
      { time: dusk, altitude: 25, sunAltitude: -18 },
      { time: early, altitude: 40, sunAltitude: -30 },
    ];
    expect(imageableCrossing(night)).toEqual({ atDusk: true, rise: null });
    expect(
      imageableCrossing([
        { time: new Date("2026-11-13T12:00:00Z"), altitude: 5, sunAltitude: 10 },
        { time: dusk, altitude: 12, sunAltitude: -18 },
        { time: early, altitude: 22, sunAltitude: -30 },
        { time: new Date("2026-11-13T23:00:00Z"), altitude: 8, sunAltitude: 5 },
      ]),
    ).toEqual({ atDusk: false, rise: early });
    expect(
      imageableCrossing([
        { time: dusk, altitude: 10, sunAltitude: -20 },
        { time: late, altitude: 15, sunAltitude: -40 },
      ]),
    ).toEqual({ atDusk: false, rise: null });
  });
});
