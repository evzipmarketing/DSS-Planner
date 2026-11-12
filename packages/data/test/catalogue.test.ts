import { describe, expect, it } from "vitest";
import { searchCatalogue } from "@dss/core";
import { deepSkyCatalogue } from "../src/catalogue";
import { constellationName } from "../src/constellations";

describe("committed catalogue", () => {
  it("includes the usual imaging targets and Lynds clouds", () => {
    const byMessier = (number: number) => deepSkyCatalogue.find((object) => object.messier === number);
    expect(byMessier(42)?.names[0]).toMatch(/Orion/);
    expect(byMessier(31)?.id).toBe("NGC0224");
    expect(byMessier(45)?.names).toContain("Pleiades");
    const horsehead = deepSkyCatalogue.find((object) => object.id === "B033");
    expect(horsehead?.names).toContain("Horsehead Nebula");
    const lynds = deepSkyCatalogue.filter((object) => object.source === "lynds");
    expect(lynds.length).toBeGreaterThan(1700);
    expect(searchCatalogue(deepSkyCatalogue, "north america")[0]?.id).toBe("NGC7000");
    expect(constellationName("Se2")).toBe("Serpens Cauda");
  });
});
