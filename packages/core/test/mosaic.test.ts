import { describe, expect, it } from "vitest";
import {
  MOSAIC_MAX_DIM,
  formatMosaicCoordsList,
  formatMosaicPanelCoords,
  mosaicPlateFovDeg,
  offsetToEquatorial,
  planMosaic,
} from "../src/mosaic";
import { angularSeparationDeg, equatorialUnit } from "../src/altitude";

const ORION = { raDeg: 83.81867, decDeg: -5.38967 };
const NARROW = { widthDeg: 1, heightDeg: 0.75 };

describe("offsetToEquatorial", () => {
  it("returns the center for a zero offset", () => {
    const point = offsetToEquatorial(ORION, 0, 0);
    expect(point.raDeg).toBeCloseTo(ORION.raDeg, 6);
    expect(point.decDeg).toBeCloseTo(ORION.decDeg, 6);
  });

  it("moves north by about the requested degrees", () => {
    const point = offsetToEquatorial(ORION, 0, 1);
    expect(point.decDeg).toBeCloseTo(ORION.decDeg + 1, 2);
    expect(
      angularSeparationDeg(equatorialUnit(ORION.raDeg, ORION.decDeg), equatorialUnit(point.raDeg, point.decDeg)),
    ).toBeCloseTo(1, 2);
  });
});

describe("planMosaic", () => {
  it("builds a centered 2×2 grid with expected panel count and labels", () => {
    const plan = planMosaic({
      centerRaDec: ORION,
      fov: NARROW,
      rows: 2,
      cols: 2,
      overlapPercent: 10,
      rotationDeg: 0,
      majorArcmin: 90,
    });

    expect(plan.panelCount).toBe(4);
    expect(plan.panels.map((panel) => panel.label)).toEqual(["P11", "P12", "P21", "P22"]);
    expect(plan.mosaicWidthDeg).toBeCloseTo(1 + 0.9, 6);
    expect(plan.mosaicHeightDeg).toBeCloseTo(0.75 + 0.75 * 0.9, 6);

    const meanRa =
      plan.panels.reduce((sum, panel) => sum + panel.raDeg, 0) / plan.panels.length;
    const meanDec =
      plan.panels.reduce((sum, panel) => sum + panel.decDeg, 0) / plan.panels.length;
    expect(meanRa).toBeCloseTo(ORION.raDeg, 2);
    expect(meanDec).toBeCloseTo(ORION.decDeg, 2);
  });

  it("caps dimensions at MOSAIC_MAX_DIM", () => {
    const plan = planMosaic({
      centerRaDec: ORION,
      fov: NARROW,
      rows: 99,
      cols: 99,
      overlapPercent: 20,
      rotationDeg: 0,
    });
    expect(plan.rows).toBe(MOSAIC_MAX_DIM);
    expect(plan.cols).toBe(MOSAIC_MAX_DIM);
    expect(plan.panelCount).toBe(MOSAIC_MAX_DIM * MOSAIC_MAX_DIM);
  });

  it("warns when the object still outspans the mosaic", () => {
    const plan = planMosaic({
      centerRaDec: ORION,
      fov: NARROW,
      rows: 2,
      cols: 2,
      overlapPercent: 10,
      rotationDeg: 0,
      majorArcmin: 200,
    });
    expect(plan.undersampled).toBe(true);
    expect(plan.coverageFit).toBe("large");
    expect(plan.coverageHint.toLowerCase()).toContain("exceeds");
  });

  it("reports good coverage when the mosaic spans the object", () => {
    const plan = planMosaic({
      centerRaDec: ORION,
      fov: { widthDeg: 2, heightDeg: 2 },
      rows: 3,
      cols: 3,
      overlapPercent: 15,
      rotationDeg: 0,
      majorArcmin: 90,
    });
    expect(plan.undersampled).toBe(false);
    expect(plan.coveragePercent).not.toBeNull();
    expect(plan.coveragePercent!).toBeLessThan(90);
  });

  it("rotates panel centers away from the axis-aligned layout", () => {
    const straight = planMosaic({
      centerRaDec: ORION,
      fov: NARROW,
      rows: 1,
      cols: 2,
      overlapPercent: 0,
      rotationDeg: 0,
    });
    const rotated = planMosaic({
      centerRaDec: ORION,
      fov: NARROW,
      rows: 1,
      cols: 2,
      overlapPercent: 0,
      rotationDeg: 90,
    });
    expect(straight.panels[0]!.decDeg).toBeCloseTo(rotated.panels[0]!.decDeg, 0);
    expect(Math.abs(straight.panels[0]!.raDeg - rotated.panels[0]!.raDeg)).toBeGreaterThan(0.2);
  });

  it("includes a four-corner polygon per panel and an outer footprint", () => {
    const plan = planMosaic({
      centerRaDec: ORION,
      fov: NARROW,
      rows: 1,
      cols: 1,
      overlapPercent: 0,
      rotationDeg: 15,
    });
    expect(plan.panels[0]!.polygon).toHaveLength(4);
    expect(plan.outerPolygon).toHaveLength(4);
    expect(mosaicPlateFovDeg(plan)).toBeGreaterThan(plan.mosaicWidthDeg);
    expect(mosaicPlateFovDeg(plan, 2)).toBeCloseTo(mosaicPlateFovDeg(plan, 1) / 2, 6);
    expect(mosaicPlateFovDeg(plan, 0.5)).toBeCloseTo(Math.min(20, mosaicPlateFovDeg(plan, 1) / 0.5), 6);
    for (const corner of plan.panels[0]!.polygon) {
      expect(corner.raDeg).toBeGreaterThanOrEqual(0);
      expect(corner.raDeg).toBeLessThan(360);
      expect(corner.decDeg).toBeGreaterThan(-90);
      expect(corner.decDeg).toBeLessThan(90);
    }
  });

  it("formats panel coordinates for copy/share", () => {
    const plan = planMosaic({
      centerRaDec: ORION,
      fov: NARROW,
      rows: 1,
      cols: 1,
      overlapPercent: 0,
      rotationDeg: 0,
    });
    const line = formatMosaicPanelCoords(plan.panels[0]!);
    expect(line.startsWith("P11:")).toBe(true);
    expect(formatMosaicCoordsList(plan)).toContain("P11:");
  });
});
