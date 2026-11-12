import { describe, expect, it } from "vitest";
import { cameras, filters, telescopes } from "../src/gear";
import { estimateBortle } from "../src/bortle-grid";

describe("gear catalogue", () => {
  it("covers the common scope, camera, and filter lists without duplicate ids", () => {
    expect(telescopes.length).toBeGreaterThanOrEqual(150);
    expect(cameras.length).toBeGreaterThanOrEqual(100);
    expect(filters.length).toBeGreaterThanOrEqual(40);
    expect(new Set(telescopes.map((item) => item.id)).size).toBe(telescopes.length);
    expect(new Set(cameras.map((item) => item.id)).size).toBe(cameras.length);
    expect(new Set(filters.map((item) => item.id)).size).toBe(filters.length);
    for (const camera of cameras) {
      expect(camera.sensorWidthMm).toBeGreaterThan(0);
      expect(camera.pixelSizeUm).toBeGreaterThan(0.5);
      expect(camera.pixelSizeUm).toBeLessThan(15);
    }
  });
});

describe("Bortle estimate", () => {
  it("reads Hyderabad as a bright city and Hanle as a dark site", () => {
    expect(estimateBortle(17.385, 78.4867)).toBeGreaterThanOrEqual(7);
    expect(estimateBortle(32.78, 78.96)).toBeLessThanOrEqual(3);
    expect(estimateBortle(40.71, -74)).toBeGreaterThanOrEqual(8);
    expect(estimateBortle(-24.6, -70.4)).toBeLessThanOrEqual(4);
  });
});
