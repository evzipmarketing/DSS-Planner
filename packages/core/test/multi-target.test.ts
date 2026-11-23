import { describe, expect, it } from "vitest";
import type { TimeInterval } from "../src/altitude";
import {
  defaultRequestedHours,
  intervalHours,
  mergeIntervals,
  multiTargetMoonAdvice,
  planMultiTargetNight,
  subtractIntervals,
  takeHoursFromIntervals,
  type MultiTargetTrack,
} from "../src/multi-target";
import type { BandAdvice } from "../src/planning";
import type { DeepSkyObject } from "../src/types";

function interval(startHour: number, endHour: number): TimeInterval {
  const day = Date.UTC(2026, 0, 15);
  return {
    start: new Date(day + startHour * 3_600_000),
    end: new Date(day + endHour * 3_600_000),
  };
}

function fakeObject(id: string): DeepSkyObject {
  return {
    id,
    names: [id],
    aliases: [],
    catalogues: ["ngc"],
    type: "G",
    raDeg: 180,
    decDeg: 20,
    magnitude: 10,
    majorArcmin: 10,
    minorArcmin: 8,
    positionAngleDeg: null,
    constellation: "Vir",
    messier: null,
    opacity: null,
    note: null,
  };
}

function fakeTrack(
  id: string,
  usable: TimeInterval[],
  peakHour: number,
  options?: {
    band?: BandAdvice;
    illuminatedFraction?: number;
    phaseName?: string;
  },
): MultiTargetTrack {
  const peak = interval(peakHour, peakHour + 0.01).start;
  return {
    object: fakeObject(id),
    band: options?.band ?? "broadband",
    track: {
      samples: [],
      usableIntervals: usable,
      usableHours: intervalHours(usable),
      maxTargetAltitude: 60,
      maxTargetTime: peak,
      moonPhaseAngle: 0,
      moonIlluminatedFraction: options?.illuminatedFraction ?? 0.1,
      moonPhaseName: options?.phaseName ?? "New",
    },
  };
}

describe("interval helpers", () => {
  it("merges overlapping intervals", () => {
    const merged = mergeIntervals([interval(1, 3), interval(2.5, 4), interval(6, 7)]);
    expect(merged).toHaveLength(2);
    expect(intervalHours(merged)).toBeCloseTo(4, 5);
  });

  it("subtracts blocked ranges", () => {
    const remaining = subtractIntervals([interval(0, 5)], [interval(1, 2), interval(3.5, 4)]);
    expect(intervalHours(remaining)).toBeCloseTo(3.5, 5);
  });

  it("takes hours from the start of intervals", () => {
    const taken = takeHoursFromIntervals([interval(0, 2), interval(4, 6)], 3);
    expect(intervalHours(taken)).toBeCloseTo(3, 5);
    expect(taken).toHaveLength(2);
  });
});

describe("planMultiTargetNight", () => {
  it("allocates non-overlapping slots peak-first", () => {
    const tracks = [
      fakeTrack("A", [interval(0, 6)], 3),
      fakeTrack("B", [interval(1, 7)], 5),
    ];
    const plan = planMultiTargetNight({
      tracks,
      requestedHoursById: { A: 2, B: 2 },
      strategy: "peak-first",
    });
    expect(plan.ordered.map((item) => item.objectId)).toEqual(["A", "B"]);
    expect(plan.ordered[0]!.allocatedHours).toBeCloseTo(2, 5);
    expect(plan.ordered[1]!.allocatedHours).toBeCloseTo(2, 5);
    const aEnd = plan.ordered[0]!.assignedIntervals[0]!.end.getTime();
    const bStart = plan.ordered[1]!.assignedIntervals[0]!.start.getTime();
    expect(bStart).toBeGreaterThanOrEqual(aEnd);
  });

  it("caps allocation by usable leftover time", () => {
    const tracks = [fakeTrack("A", [interval(0, 2)], 1), fakeTrack("B", [interval(0, 2)], 1.5)];
    const plan = planMultiTargetNight({
      tracks,
      requestedHoursById: { A: 2, B: 2 },
      strategy: "peak-first",
    });
    expect(plan.ordered[0]!.allocatedHours).toBeCloseTo(2, 5);
    expect(plan.ordered[1]!.allocatedHours).toBeCloseTo(0, 5);
  });

  it("builds equal default budgets capped by usable hours", () => {
    const tracks = [fakeTrack("A", [interval(0, 4)], 2), fakeTrack("B", [interval(0, 2)], 1)];
    const budgets = defaultRequestedHours(tracks);
    // total usable 6h → equal share 3h; B capped at 2h
    expect(budgets.A).toBe(3);
    expect(budgets.B).toBe(2);
  });

  it("respects manual orderIds for shoot sequence", () => {
    const tracks = [
      fakeTrack("A", [interval(0, 6)], 3),
      fakeTrack("B", [interval(0, 6)], 2),
    ];
    const plan = planMultiTargetNight({
      tracks,
      requestedHoursById: { A: 2, B: 2 },
      orderIds: ["B", "A"],
    });
    expect(plan.ordered.map((item) => item.objectId)).toEqual(["B", "A"]);
    const bEnd = plan.ordered[0]!.assignedIntervals[0]!.end.getTime();
    const aStart = plan.ordered[1]!.assignedIntervals[0]!.start.getTime();
    expect(aStart).toBeGreaterThanOrEqual(bEnd);
  });
});

describe("multiTargetMoonAdvice", () => {
  it("warns when a broadband target is planned on a bright-Moon night", () => {
    const advice = multiTargetMoonAdvice(
      fakeTrack("M31", [interval(0, 4)], 2, {
        band: "broadband",
        illuminatedFraction: 1,
        phaseName: "Full",
      }),
    );
    expect(advice.hint).toMatch(/broadband not recommended/i);
    expect(advice.score).toBeLessThan(0.5);
  });

  it("does not warn narrowband targets solely for a bright Moon", () => {
    const advice = multiTargetMoonAdvice(
      fakeTrack("NGC7000", [interval(0, 4)], 2, {
        band: "narrowband",
        illuminatedFraction: 1,
        phaseName: "Full",
      }),
    );
    expect(advice.hint).toBeNull();
    expect(advice.score).toBeGreaterThan(0.5);
  });
});

