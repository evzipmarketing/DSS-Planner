import { describe, expect, it } from "vitest";
import {
  bandAdviceForRigFilters,
  defaultPlannedHoursForUsable,
  detectMultiRigConflicts,
  planMultiRigs,
  type MultiRigAssignmentResult,
} from "../src/multi-rigs";
import { IMAGEABLE_SAMPLE_MINUTES, type DeepSkyObject, type Site } from "../src/types";
import type { TimeInterval } from "../src/altitude";

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

const M31: DeepSkyObject = {
  id: "NGC224",
  type: "G",
  raDeg: 10.6847,
  decDeg: 41.2687,
  constellation: "And",
  majorArcmin: 190,
  minorArcmin: 60,
  positionAngleDeg: null,
  magnitude: 3.4,
  messier: 31,
  names: ["Andromeda Galaxy"],
  opacity: null,
  aliases: ["M31"],
  catalogues: ["ngc", "messier"],
  note: null,
};

const WIDE_FIELD = { widthArcmin: 120, heightArcmin: 80 };
const NARROW_FIELD = { widthArcmin: 40, heightArcmin: 30 };

function interval(startHour: number, endHour: number): TimeInterval {
  const day = Date.UTC(2026, 0, 15);
  return {
    start: new Date(day + startHour * 3_600_000),
    end: new Date(day + endHour * 3_600_000),
  };
}

function fakeResult(
  partial: Partial<MultiRigAssignmentResult> & Pick<MultiRigAssignmentResult, "rigId" | "objectId" | "objectName">,
): MultiRigAssignmentResult {
  return {
    rigName: partial.rigId,
    filterIds: [],
    band: "broadband",
    plannedHours: 2,
    allocatedHours: 2,
    usableHours: 5,
    assignedIntervals: [interval(1, 3)],
    usableIntervals: [interval(0, 5)],
    frameFillPercent: 40,
    frameFit: "good",
    maxAltitudeDeg: 60,
    peakTime: interval(2, 2.01).start,
    track: {
      samples: [],
      usableIntervals: [interval(0, 5)],
      usableHours: 5,
      maxTargetAltitude: 60,
      maxTargetTime: interval(2, 2.01).start,
      moonPhaseAngle: 0,
      moonIlluminatedFraction: 0.1,
      moonPhaseName: "New",
    },
    ...partial,
  };
}

describe("bandAdviceForRigFilters", () => {
  it("uses object advice when no filters are selected", () => {
    expect(bandAdviceForRigFilters([], M42)).toBe("narrowband");
    expect(bandAdviceForRigFilters([], M31)).toBe("broadband");
    expect(bandAdviceForRigFilters([])).toBe("broadband");
  });

  it("returns both when narrow and broadband filters are mixed", () => {
    expect(bandAdviceForRigFilters(["ha", "luminance"], M42)).toBe("both");
    expect(bandAdviceForRigFilters(["dual_narrowband"], M31)).toBe("narrowband");
    expect(bandAdviceForRigFilters(["luminance", "red"], M42)).toBe("broadband");
  });
});

describe("defaultPlannedHoursForUsable", () => {
  it("caps at 3 h and floors empty windows", () => {
    expect(defaultPlannedHoursForUsable(0)).toBe(0);
    expect(defaultPlannedHoursForUsable(10)).toBe(3);
    expect(defaultPlannedHoursForUsable(2)).toBe(1);
  });
});

describe("detectMultiRigConflicts", () => {
  it("flags a shortage when the same object needs more hours than are imageable", () => {
    const conflicts = detectMultiRigConflicts([
      fakeResult({
        rigId: "a",
        objectId: "NGC1976",
        objectName: "M42",
        plannedHours: 4,
        usableHours: 5,
        assignedIntervals: [interval(0, 4)],
      }),
      fakeResult({
        rigId: "b",
        objectId: "NGC1976",
        objectName: "M42",
        plannedHours: 3,
        usableHours: 5,
        assignedIntervals: [interval(2, 5)],
      }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.kind).toBe("shared-peak-shortage");
    expect(conflicts[0]!.rigIds).toEqual(["a", "b"]);
  });

  it("notes overlapping schedules when combined hours still fit", () => {
    const conflicts = detectMultiRigConflicts([
      fakeResult({
        rigId: "a",
        objectId: "NGC1976",
        objectName: "M42",
        plannedHours: 2,
        usableHours: 6,
        assignedIntervals: [interval(1, 3)],
      }),
      fakeResult({
        rigId: "b",
        objectId: "NGC1976",
        objectName: "M42",
        plannedHours: 2,
        usableHours: 6,
        assignedIntervals: [interval(2, 4)],
      }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.kind).toBe("overlapping-schedule");
  });

  it("ignores different objects even when windows overlap", () => {
    const conflicts = detectMultiRigConflicts([
      fakeResult({
        rigId: "a",
        objectId: "NGC1976",
        objectName: "M42",
        assignedIntervals: [interval(1, 3)],
      }),
      fakeResult({
        rigId: "b",
        objectId: "NGC224",
        objectName: "M31",
        assignedIntervals: [interval(1, 3)],
      }),
    ]);
    expect(conflicts).toEqual([]);
  });
});

describe("planMultiRigs", () => {
  it("returns FOV fill and planned intervals per rig", () => {
    const plan = planMultiRigs({
      site: HYDERABAD,
      dateIso: "2026-01-15",
      stepMinutes: IMAGEABLE_SAMPLE_MINUTES,
      assignments: [
        {
          rigId: "wide",
          rigName: "Wide rig",
          object: M42,
          filterIds: ["ha"],
          band: "narrowband",
          plannedHours: 2,
          field: WIDE_FIELD,
        },
        {
          rigId: "narrow",
          rigName: "Narrow rig",
          object: M31,
          filterIds: ["luminance"],
          band: "broadband",
          plannedHours: 1.5,
          field: NARROW_FIELD,
        },
      ],
    });

    expect(plan.assignments).toHaveLength(2);
    expect(plan.conflicts).toEqual([]);

    const wide = plan.assignments.find((item) => item.rigId === "wide")!;
    const narrow = plan.assignments.find((item) => item.rigId === "narrow")!;
    expect(wide.objectId).toBe("NGC1976");
    expect(wide.frameFillPercent).toBeGreaterThan(0);
    expect(wide.frameFit).not.toBe("unknown");
    expect(wide.allocatedHours).toBeGreaterThan(0);
    expect(wide.assignedIntervals.length).toBeGreaterThan(0);
    expect(narrow.objectId).toBe("NGC224");
    expect(narrow.frameFillPercent).toBeGreaterThan(100);
    expect(narrow.frameFit).toBe("large");
  });

  it("flags same-object over-subscription across two rigs", () => {
    const plan = planMultiRigs({
      site: HYDERABAD,
      dateIso: "2026-01-15",
      stepMinutes: IMAGEABLE_SAMPLE_MINUTES,
      assignments: [
        {
          rigId: "a",
          rigName: "Rig A",
          object: M42,
          filterIds: [],
          band: "narrowband",
          plannedHours: 8,
          field: WIDE_FIELD,
        },
        {
          rigId: "b",
          rigName: "Rig B",
          object: M42,
          filterIds: [],
          band: "narrowband",
          plannedHours: 8,
          field: NARROW_FIELD,
        },
      ],
    });
    expect(plan.assignments).toHaveLength(2);
    expect(plan.conflicts.some((item) => item.kind === "shared-peak-shortage")).toBe(true);
  });

  it("keeps multiple targets on one rig from overlapping in time", () => {
    const plan = planMultiRigs({
      site: HYDERABAD,
      dateIso: "2026-01-15",
      stepMinutes: IMAGEABLE_SAMPLE_MINUTES,
      assignments: [
        {
          rigId: "a",
          rigName: "Rig A",
          object: M42,
          filterIds: [],
          band: "narrowband",
          plannedHours: 3,
          field: WIDE_FIELD,
        },
        {
          rigId: "a",
          rigName: "Rig A",
          object: M31,
          filterIds: [],
          band: "broadband",
          plannedHours: 3,
          field: WIDE_FIELD,
        },
      ],
    });
    expect(plan.assignments).toHaveLength(2);
    const [first, second] = plan.assignments;
    expect(first!.rigId).toBe("a");
    expect(second!.rigId).toBe("a");
    for (const left of first!.assignedIntervals) {
      for (const right of second!.assignedIntervals) {
        expect(left.start.getTime() < right.end.getTime() && right.start.getTime() < left.end.getTime()).toBe(false);
      }
    }
  });
});
