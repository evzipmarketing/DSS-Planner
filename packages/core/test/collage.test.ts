import { describe, expect, it } from "vitest";
import {
  collagePlateFovDeg,
  equatorialToOffset,
  filterCatalogueIgnoringDate,
  fovCoversCollage,
  planCollage,
  selectCollageCatalogueCandidates,
  suggestCollageGroups,
} from "../src/collage";
import type { DeepSkyObject } from "../src/types";
import { offsetToEquatorial } from "../src/mosaic";
import { angularSeparationDeg, equatorialUnit } from "../src/altitude";

const CENTER = { raDeg: 83.82, decDeg: -5.39 };

describe("equatorialToOffset", () => {
  it("round-trips with offsetToEquatorial for small offsets", () => {
    const point = offsetToEquatorial(CENTER, 0.4, -0.25);
    const offset = equatorialToOffset(CENTER, point);
    expect(offset.eastDeg).toBeCloseTo(0.4, 3);
    expect(offset.northDeg).toBeCloseTo(-0.25, 3);
  });
});

describe("planCollage", () => {
  it("returns null for an empty target list", () => {
    expect(
      planCollage({
        targets: [],
        fov: { widthDeg: 2, heightDeg: 1.5 },
      }),
    ).toBeNull();
  });

  it("fits nearby targets in a wide FOV", () => {
    const a = offsetToEquatorial(CENTER, -0.3, 0.2);
    const b = offsetToEquatorial(CENTER, 0.35, -0.15);
    const plan = planCollage({
      targets: [
        { id: "a", name: "A", raDeg: a.raDeg, decDeg: a.decDeg },
        { id: "b", name: "B", raDeg: b.raDeg, decDeg: b.decDeg },
      ],
      fov: { widthDeg: 2, heightDeg: 1.5 },
      paddingPercent: 10,
    });

    expect(plan).not.toBeNull();
    expect(plan!.fits).toBe(true);
    expect(plan!.outsideCount).toBe(0);
    expect(plan!.targets).toHaveLength(2);
    expect(Math.max(plan!.requiredWidthDeg, plan!.requiredHeightDeg)).toBeGreaterThan(0.5);
    expect(plan!.framePolygon).toHaveLength(4);
    expect(plan!.requiredPolygon).toHaveLength(4);
    expect(
      angularSeparationDeg(
        equatorialUnit(plan!.center.raDeg, plan!.center.decDeg),
        equatorialUnit(CENTER.raDeg, CENTER.decDeg),
      ),
    ).toBeLessThan(0.5);
  });

  it("flags targets outside a narrow FOV", () => {
    const a = offsetToEquatorial(CENTER, -0.8, 0);
    const b = offsetToEquatorial(CENTER, 0.8, 0);
    const plan = planCollage({
      targets: [
        { id: "a", name: "A", raDeg: a.raDeg, decDeg: a.decDeg },
        { id: "b", name: "B", raDeg: b.raDeg, decDeg: b.decDeg },
      ],
      fov: { widthDeg: 0.5, heightDeg: 0.4 },
      paddingPercent: 10,
      rotationDeg: 0,
    });

    expect(plan).not.toBeNull();
    expect(plan!.fits).toBe(false);
    expect(plan!.outsideCount).toBeGreaterThan(0);
    expect(plan!.requiredWidthDeg).toBeGreaterThan(plan!.frameWidthDeg);
  });

  it("respects a fixed rotation override", () => {
    const a = offsetToEquatorial(CENTER, -0.4, 0.05);
    const b = offsetToEquatorial(CENTER, 0.4, -0.05);
    const plan = planCollage({
      targets: [
        { id: "a", name: "A", raDeg: a.raDeg, decDeg: a.decDeg },
        { id: "b", name: "B", raDeg: b.raDeg, decDeg: b.decDeg },
      ],
      fov: { widthDeg: 3, heightDeg: 2 },
      rotationDeg: 30,
    });
    expect(plan!.rotationDeg).toBe(30);
  });
});

describe("fovCoversCollage", () => {
  it("accepts either sensor orientation", () => {
    expect(fovCoversCollage({ widthDeg: 2, heightDeg: 1 }, 1.5, 0.8)).toBe(true);
    expect(fovCoversCollage({ widthDeg: 1, heightDeg: 2 }, 1.5, 0.8)).toBe(true);
    expect(fovCoversCollage({ widthDeg: 1, heightDeg: 0.5 }, 1.5, 0.8)).toBe(false);
  });
});

describe("suggestCollageGroups", () => {
  it("suggests a pair that fits a wide FOV and skips distant outliers", () => {
    const a = offsetToEquatorial(CENTER, -0.2, 0.1);
    const b = offsetToEquatorial(CENTER, 0.25, -0.05);
    const far = offsetToEquatorial(CENTER, 8, 0);
    const groups = suggestCollageGroups({
      targets: [
        { id: "a", name: "A", raDeg: a.raDeg, decDeg: a.decDeg },
        { id: "b", name: "B", raDeg: b.raDeg, decDeg: b.decDeg },
        { id: "far", name: "Far", raDeg: far.raDeg, decDeg: far.decDeg },
      ],
      fov: { widthDeg: 2, heightDeg: 1.5 },
      paddingPercent: 10,
    });

    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0]!.targetIds).toEqual(["a", "b"]);
    expect(groups[0]!.plan.fits).toBe(true);
    expect(groups.every((group) => !group.targetIds.includes("far") || group.targetIds.length === 1)).toBe(true);
  });

  it("returns empty when nothing can pair inside a tiny FOV", () => {
    const a = offsetToEquatorial(CENTER, -0.8, 0);
    const b = offsetToEquatorial(CENTER, 0.8, 0);
    const groups = suggestCollageGroups({
      targets: [
        { id: "a", name: "A", raDeg: a.raDeg, decDeg: a.decDeg },
        { id: "b", name: "B", raDeg: b.raDeg, decDeg: b.decDeg },
      ],
      fov: { widthDeg: 0.3, heightDeg: 0.2 },
    });
    expect(groups).toEqual([]);
  });
});

describe("selectCollageCatalogueCandidates", () => {
  it("prefers Messier objects and respects the cap", () => {
    const catalogue: DeepSkyObject[] = [
      stubObject({ id: "ngc1", magnitude: 12, messier: null, names: [] }),
      stubObject({ id: "m42", magnitude: 4, messier: 42, names: ["Orion Nebula"], type: "EmN" }),
      stubObject({ id: "m31", magnitude: 3.4, messier: 31, names: ["Andromeda"], type: "G" }),
      stubObject({ id: "ngc2", magnitude: 11, messier: null, names: ["Named"], type: "G" }),
    ];
    const picked = selectCollageCatalogueCandidates(catalogue, { widthDeg: 2, heightDeg: 1.5 }, 2);
    expect(picked.map((item) => item.id)).toEqual(["m31", "m42"]);
  });
});

describe("filterCatalogueIgnoringDate", () => {
  it("keeps list filters like narrowband without using the night date", () => {
    const catalogue: DeepSkyObject[] = [
      stubObject({ id: "m42", magnitude: 4, messier: 42, names: ["Orion Nebula"], type: "EmN" }),
      stubObject({ id: "m31", magnitude: 3.4, messier: 31, names: ["Andromeda"], type: "G" }),
      stubObject({ id: "m27", magnitude: 7.4, messier: 27, names: ["Dumbbell"], type: "PN" }),
    ];
    const picked = filterCatalogueIgnoringDate({
      catalogue,
      fov: { widthDeg: 2, heightDeg: 1.5 },
      listFilter: "narrowband",
    });
    expect(picked.map((item) => item.id).sort()).toEqual(["m27", "m42"]);
  });
});

describe("collagePlateFovDeg", () => {
  it("returns a plate FOV wider than the sensor frame", () => {
    const fov = collagePlateFovDeg({
      frameWidthDeg: 2,
      frameHeightDeg: 1.5,
      requiredWidthDeg: 1.2,
      requiredHeightDeg: 0.9,
    });
    expect(fov).toBeGreaterThan(2);
    expect(fov).toBeLessThanOrEqual(20);
  });

  it("zooms out more when the required span nearly fills the frame", () => {
    const roomy = collagePlateFovDeg({
      frameWidthDeg: 4,
      frameHeightDeg: 3,
      requiredWidthDeg: 1.5,
      requiredHeightDeg: 1.2,
    });
    const tight = collagePlateFovDeg({
      frameWidthDeg: 4,
      frameHeightDeg: 3,
      requiredWidthDeg: 3.85,
      requiredHeightDeg: 2.9,
    });
    expect(tight).toBeGreaterThan(roomy);
  });
});

function stubObject(partial: Partial<DeepSkyObject> & Pick<DeepSkyObject, "id">): DeepSkyObject {
  return {
    id: partial.id,
    type: partial.type ?? "G",
    raDeg: partial.raDeg ?? 10,
    decDeg: partial.decDeg ?? 20,
    constellation: partial.constellation ?? null,
    majorArcmin: partial.majorArcmin ?? 10,
    minorArcmin: partial.minorArcmin ?? 8,
    positionAngleDeg: partial.positionAngleDeg ?? null,
    magnitude: partial.magnitude ?? null,
    messier: partial.messier ?? null,
    names: partial.names ?? [],
    opacity: partial.opacity ?? null,
    aliases: partial.aliases ?? [],
    catalogues: partial.catalogues ?? ["ngc"],
    note: partial.note ?? null,
  };
}
