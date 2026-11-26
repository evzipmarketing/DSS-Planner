import { describe, expect, it } from "vitest";
import {
  asterismFitLabel,
  asterismPlateFovDeg,
  classifyAsterismFit,
  planAsterismFrame,
} from "../src/asterisms";
import { collagePlateFovDeg, planCollage } from "../src/collage";

const BELT = [
  { id: "a", name: "Alnitak", raDeg: 85.19, decDeg: -1.94 },
  { id: "b", name: "Alnilam", raDeg: 84.05, decDeg: -1.2 },
  { id: "c", name: "Mintaka", raDeg: 83.0, decDeg: -0.3 },
];

describe("planAsterismFrame", () => {
  it("returns null for an empty star list", () => {
    expect(
      planAsterismFrame({
        stars: [],
        fov: { widthDeg: 3, heightDeg: 2 },
      }),
    ).toBeNull();
  });

  it("fits a compact pattern in a wide FOV", () => {
    const plan = planAsterismFrame({
      stars: BELT,
      fov: { widthDeg: 5, heightDeg: 4 },
      paddingPercent: 12,
    });
    expect(plan).not.toBeNull();
    expect(plan!.fit).toBe("fits");
    expect(plan!.collage.fits).toBe(true);
    expect(asterismFitLabel(plan!.fit)).toBe("Fits FOV");
  });

  it("flags needs_wider when the FOV is too small", () => {
    const plan = planAsterismFrame({
      stars: BELT,
      fov: { widthDeg: 0.3, heightDeg: 0.2 },
      paddingPercent: 12,
    });
    expect(plan).not.toBeNull();
    expect(plan!.fit).toBe("needs_wider");
  });

  it("classifies tight when the FOV only just covers the required span", () => {
    const baseline = planCollage({
      targets: BELT,
      fov: { widthDeg: 8, heightDeg: 6 },
      paddingPercent: 5,
    });
    expect(baseline).not.toBeNull();
    const synthetic = {
      ...baseline!,
      frameWidthDeg: baseline!.requiredWidthDeg * 1.03,
      frameHeightDeg: baseline!.requiredHeightDeg * 1.03,
      fits: true,
      outsideCount: 0,
      targets: baseline!.targets.map((item) => ({ ...item, status: "inside" as const })),
    };
    expect(classifyAsterismFit(synthetic)).toBe("tight");
  });

  it("adds fit-based zoom-out on top of the collage plate FOV", () => {
    const roomy = planAsterismFrame({
      stars: BELT,
      fov: { widthDeg: 8, heightDeg: 6 },
      paddingPercent: 12,
    });
    expect(roomy).not.toBeNull();
    expect(roomy!.fit).toBe("fits");
    expect(asterismPlateFovDeg(roomy!)).toBeGreaterThan(collagePlateFovDeg(roomy!.collage));

    const tightCollage = planCollage({
      targets: BELT,
      fov: { widthDeg: 8, heightDeg: 6 },
      paddingPercent: 5,
    })!;
    const tightPlan = {
      collage: {
        ...tightCollage,
        frameWidthDeg: tightCollage.requiredWidthDeg * 1.03,
        frameHeightDeg: tightCollage.requiredHeightDeg * 1.03,
        fits: true,
        outsideCount: 0,
        targets: tightCollage.targets.map((item) => ({ ...item, status: "inside" as const })),
      },
      fit: "tight" as const,
      fitLabel: "Tight fit",
      hint: "tight",
      spanDeg: Math.max(tightCollage.spanWidthDeg, tightCollage.spanHeightDeg),
    };

    expect(asterismPlateFovDeg(tightPlan)).toBeGreaterThan(collagePlateFovDeg(tightPlan.collage));
    expect(asterismPlateFovDeg(tightPlan) / collagePlateFovDeg(tightPlan.collage)).toBeGreaterThan(
      asterismPlateFovDeg(roomy!) / collagePlateFovDeg(roomy!.collage),
    );
  });
});
