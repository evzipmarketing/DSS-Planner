import { describe, expect, it } from "vitest";
import { ASTERISMS, getAsterism, searchAsterisms } from "../src/asterisms";

describe("asterism catalogue", () => {
  it("includes a starter set of well-known patterns", () => {
    expect(ASTERISMS.length).toBeGreaterThanOrEqual(15);
    expect(getAsterism("big-dipper")?.stars.length).toBeGreaterThanOrEqual(7);
  });

  it("searches by name and alias", () => {
    const plough = searchAsterisms("plough");
    expect(plough.some((item) => item.id === "big-dipper")).toBe(true);
    const belt = searchAsterisms("orion belt");
    expect(belt.some((item) => item.id === "orions-belt")).toBe(true);
  });

  it("returns the full set for an empty query", () => {
    expect(searchAsterisms("").length).toBe(ASTERISMS.length);
  });
});
