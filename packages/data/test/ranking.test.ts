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
});
