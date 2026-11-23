import { describe, expect, it } from "vitest";
import { buildPlanCsv, planCsvRowFromTarget, type PlanCsvRow } from "../src/export-csv";
import type { DeepSkyObject } from "../src/types";

const sample: DeepSkyObject = {
  id: "NGC1976",
  names: ["Great Orion Nebula"],
  aliases: ["M42"],
  catalogues: ["NGC", "Messier"],
  type: "HII",
  raDeg: 83.8221,
  decDeg: -5.3911,
  magnitude: 4.0,
  majorArcmin: 65,
  minorArcmin: 60,
  positionAngleDeg: null,
  constellation: "Ori",
  messier: 42,
  opacity: null,
  note: null,
};

describe("export csv", () => {
  it("builds a header row and escapes commas and quotes", () => {
    const rows: PlanCsvRow[] = [
      {
        id: "NGC1976",
        name: 'Orion, "M42"',
        designation: "M42",
        ra: "05h 35m 17s",
        dec: "−05° 23′ 28″",
        type: "H II region",
        constellation: "Orion",
        frameFillPercent: "137",
        usableHours: "7.8",
        band: "Narrowband",
        listName: "Tonight",
      },
    ];
    const csv = buildPlanCsv(rows);
    expect(csv.startsWith("id,name,designation,ra,dec,type,constellation,frameFillPercent,usableHours,band,listName\n")).toBe(
      true,
    );
    expect(csv).toContain('"Orion, ""M42"""');
    expect(csv.trimEnd().split("\n")).toHaveLength(2);
  });

  it("maps a target into a csv row", () => {
    const row = planCsvRowFromTarget({
      object: sample,
      frameFillPercent: 136.6,
      usableHours: 7.84,
      band: "narrowband",
      constellation: "Orion",
      listName: "Favorites",
    });
    expect(row.id).toBe("NGC1976");
    expect(row.name).toBe("Great Orion Nebula");
    expect(row.designation).toBe("M42");
    expect(row.frameFillPercent).toBe("137");
    expect(row.usableHours).toBe("7.8");
    expect(row.band).toBe("Narrowband");
    expect(row.listName).toBe("Favorites");
    expect(row.constellation).toBe("Orion");
  });
});
