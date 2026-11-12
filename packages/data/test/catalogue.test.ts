import { describe, expect, it } from "vitest";
import { searchCatalogue } from "@dss/core";
import { deepSkyCore } from "../src/catalogue-core";
import { deepSkyExtended } from "../src/catalogue-extended";
import { constellationName } from "../src/constellations";

describe("committed catalogue", () => {
  const all = [...deepSkyCore, ...deepSkyExtended];

  it("includes every Messier object and the usual cross-identifications", () => {
    const messier = new Set(all.flatMap((object) => object.aliases.filter((alias) => /^M\d+$/.test(alias)).map((alias) => Number(alias.slice(1)))));
    expect([...messier].sort((a, b) => a - b)).toEqual(Array.from({ length: 110 }, (_, index) => index + 1));
    const orion = all.find((object) => object.messier === 42);
    expect(orion?.aliases).toEqual(expect.arrayContaining(["NGC1976", "LBN974", "Sh2-281"]));
    const spindle = all.find((object) => object.aliases.includes("M102"));
    expect(spindle?.id).toBe("NGC5866");
    expect(spindle?.note).toMatch(/NGC 5866/);
    const horsehead = all.find((object) => object.aliases.includes("B33"));
    expect(horsehead?.names.join(" ")).toMatch(/Horsehead/);
    expect(all.filter((object) => object.catalogues.includes("ldn")).length).toBeGreaterThan(1700);
    expect(searchCatalogue(all, "north america")[0]?.id).toBe("NGC7000");
    expect(searchCatalogue(all, "sh2-281")[0]?.messier).toBe(42);
    expect(constellationName("Se2")).toBe("Serpens Cauda");
    expect(deepSkyCore.length).toBeGreaterThan(4000);
    expect(deepSkyExtended.length).toBeGreaterThan(deepSkyCore.length);
  });
});
