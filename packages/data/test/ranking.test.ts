import { describe, expect, it } from "vitest";
import { fieldOfView, rankTargets, type DeepSkyObject } from "@dss/core";
import { deepSkyCore } from "../src/catalogue-core";
import { deepSkyExtended } from "../src/catalogue-extended";
import { cameras, defaultCameraId, defaultTelescopeId, telescopes } from "../src/gear";
import { defaultSite } from "../src/locations";

function showpiece(object: DeepSkyObject): boolean {
  if (object.messier != null) return true;
  if (object.aliases.some((id) => /^C\d+$/.test(id))) return true;
  const ngc = /^NGC\d/.test(object.id) || object.aliases.some((id) => /^NGC\d/.test(id));
  return ngc && object.magnitude != null && object.magnitude <= 9;
}

function darkNebula(object: DeepSkyObject): boolean {
  if (object.type === "DrkN") return true;
  return [object.id, ...object.aliases].some((id) => /^LDN\d/.test(id) || /^B\d/.test(id));
}

describe("city shortlist", () => {
  it("fills a Bortle 9 November night from Hyderabad with showpieces, not dark nebulae", () => {
    const scope = telescopes.find((item) => item.id === defaultTelescopeId);
    const camera = cameras.find((item) => item.id === defaultCameraId);
    expect(scope).toBeTruthy();
    expect(camera).toBeTruthy();
    const field = fieldOfView(camera!, scope!.focalLengthMm);
    const ranked = rankTargets(
      [...deepSkyCore, ...deepSkyExtended],
      defaultSite,
      "2026-11-12",
      10,
      undefined,
      { widthArcmin: field.widthArcmin, heightArcmin: field.heightArcmin },
      "all",
      9,
    );
    expect(ranked.filter((item) => showpiece(item.object)).length).toBeGreaterThanOrEqual(5);
    expect(ranked.some((item) => darkNebula(item.object))).toBe(false);
  });

  it("keeps frame fill identical across dates and different across telescopes", () => {
    const camera = cameras.find((item) => item.id === defaultCameraId)!;
    const short = telescopes.find((item) => item.id === "sw-evostar-72ed")!;
    const long = telescopes.find((item) => item.id === "celestron-c8")!;
    const shortField = fieldOfView(camera, short.focalLengthMm);
    const longField = fieldOfView(camera, long.focalLengthMm);
    const catalogue = [...deepSkyCore, ...deepSkyExtended];
    const dates = ["2026-11-12", "2026-12-01", "2027-01-15"];
    const fills = dates.map((date) => {
      const ranked = rankTargets(catalogue, defaultSite, date, 40, undefined, {
        widthArcmin: shortField.widthArcmin,
        heightArcmin: shortField.heightArcmin,
      });
      const orion = ranked.find((item) => item.object.messier === 42);
      expect(orion).toBeTruthy();
      return orion!.frameFillPercent;
    });
    expect(fills[0]).toBeCloseTo(fills[1]!, 8);
    expect(fills[0]).toBeCloseTo(fills[2]!, 8);

    const withLong = rankTargets(catalogue, defaultSite, dates[0]!, 40, undefined, {
      widthArcmin: longField.widthArcmin,
      heightArcmin: longField.heightArcmin,
    });
    const orionLong = withLong.find((item) => item.object.messier === 42);
    expect(orionLong).toBeTruthy();
    expect(orionLong!.frameFillPercent).not.toBeCloseTo(fills[0]!, 1);
    expect(orionLong!.frameFillPercent!).toBeGreaterThan(fills[0]!);
  });
});
