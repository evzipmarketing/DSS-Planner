import { describe, expect, it } from "vitest";
import { enumerateNightDates, planSingleTarget, SINGLE_TARGET_MAX_NIGHTS } from "../src/single-target";
import { IMAGEABLE_SAMPLE_MINUTES, type DeepSkyObject, type Site } from "../src/types";

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
  names: ["Great Orion Nebula"],
  opacity: null,
  aliases: ["M42"],
  catalogues: ["ngc", "messier"],
  note: null,
};

describe("enumerateNightDates", () => {
  it("lists consecutive ISO dates and caps length", () => {
    expect(enumerateNightDates("2026-01-15", 3)).toEqual(["2026-01-15", "2026-01-16", "2026-01-17"]);
    expect(enumerateNightDates("2026-01-15", 100)).toHaveLength(SINGLE_TARGET_MAX_NIGHTS);
    expect(enumerateNightDates("2026-01-15", 0)).toEqual([]);
  });
});

describe("planSingleTarget", () => {
  it("returns only nights needed to reach the goal, with imageable intervals", () => {
    const plan = planSingleTarget({
      object: M42,
      site: HYDERABAD,
      startDateIso: "2026-01-15",
      goalHours: 3,
      stepMinutes: IMAGEABLE_SAMPLE_MINUTES,
    });
    expect(plan.objectId).toBe("NGC1976");
    expect(plan.goalMet).toBe(true);
    expect(plan.nightsNeeded).not.toBeNull();
    expect(plan.nights.length).toBe(plan.nightsNeeded);
    expect(plan.cumulativeHours).toBeGreaterThanOrEqual(3);
    expect(plan.remainingHours).toBe(0);
    for (const night of plan.nights) {
      expect(night.plannedHours).toBeGreaterThan(0);
      expect(night.usableIntervals.length).toBeGreaterThan(0);
      expect(night.plannedIntervals.length).toBeGreaterThan(0);
    }
  });

  it("stops early once the goal is met", () => {
    const plan = planSingleTarget({
      object: M42,
      site: HYDERABAD,
      startDateIso: "2026-01-15",
      goalHours: 1,
      maxNights: 20,
      stepMinutes: IMAGEABLE_SAMPLE_MINUTES,
    });
    expect(plan.goalMet).toBe(true);
    expect(plan.nights.length).toBeGreaterThanOrEqual(1);
    expect(plan.nightsScanned).toBeLessThanOrEqual(20);
    expect(plan.nights.every((night) => night.plannedHours > 0)).toBe(true);
  });

  it("reports remaining hours when the search window cannot finish the goal", () => {
    const plan = planSingleTarget({
      object: M42,
      site: HYDERABAD,
      startDateIso: "2026-01-15",
      goalHours: 100,
      maxNights: 3,
      stepMinutes: IMAGEABLE_SAMPLE_MINUTES,
    });
    expect(plan.goalMet).toBe(false);
    expect(plan.nightsNeeded).toBeNull();
    expect(plan.remainingHours).toBeGreaterThan(0);
    expect(plan.cumulativeHours).toBeLessThan(100);
  });

  it("skips bright-Moon nights for broadband but keeps them for narrowband", () => {
    const start = "2026-11-01";
    const broadband = planSingleTarget({
      object: M42,
      site: HYDERABAD,
      startDateIso: start,
      goalHours: 8,
      maxNights: 20,
      band: "broadband",
      stepMinutes: IMAGEABLE_SAMPLE_MINUTES,
    });
    const narrowband = planSingleTarget({
      object: M42,
      site: HYDERABAD,
      startDateIso: start,
      goalHours: 8,
      maxNights: 20,
      band: "narrowband",
      stepMinutes: IMAGEABLE_SAMPLE_MINUTES,
    });

    expect(broadband.band).toBe("broadband");
    expect(broadband.nights.every((night) => night.moonIlluminatedFraction < 0.35)).toBe(true);
    expect(narrowband.nights.some((night) => night.moonIlluminatedFraction >= 0.35)).toBe(true);
  });
});
