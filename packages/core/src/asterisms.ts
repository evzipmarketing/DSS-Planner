import {
  collagePlateFovDeg,
  fovCoversCollage,
  planCollage,
  type CollageFov,
  type CollagePlan,
  type CollageTargetInput,
} from "./collage";

export type AsterismFitKind = "fits" | "tight" | "needs_wider";

export type AsterismFramePlan = {
  collage: CollagePlan;
  fit: AsterismFitKind;
  fitLabel: string;
  hint: string;
  /** Major angular span of the pattern (max of required axes before padding readout). */
  spanDeg: number;
};

export type PlanAsterismFrameInput = {
  stars: CollageTargetInput[];
  fov: CollageFov;
  /** Extra margin around the pattern (0–40). Default 12. */
  paddingPercent?: number;
  rotationDeg?: number | null;
};

/**
 * Frame-check an asterism against the active FOV by reusing collage geometry.
 */
export function planAsterismFrame(input: PlanAsterismFrameInput): AsterismFramePlan | null {
  const collage = planCollage({
    targets: input.stars,
    fov: input.fov,
    paddingPercent: input.paddingPercent ?? 12,
    rotationDeg: input.rotationDeg,
  });
  if (!collage) return null;

  const fit = classifyAsterismFit(collage);
  return {
    collage,
    fit,
    fitLabel: asterismFitLabel(fit),
    hint: asterismFitHint(fit, collage),
    spanDeg: Math.max(collage.spanWidthDeg, collage.spanHeightDeg),
  };
}

export function classifyAsterismFit(plan: CollagePlan): AsterismFitKind {
  if (!plan.fits || plan.outsideCount > 0) return "needs_wider";
  const fov = { widthDeg: plan.frameWidthDeg, heightDeg: plan.frameHeightDeg };
  const coversEitherWay = fovCoversCollage(fov, plan.requiredWidthDeg, plan.requiredHeightDeg);
  if (!coversEitherWay) return "needs_wider";
  const coversComfortably =
    (fov.widthDeg >= plan.requiredWidthDeg * 1.08 && fov.heightDeg >= plan.requiredHeightDeg * 1.08) ||
    (fov.widthDeg >= plan.requiredHeightDeg * 1.08 && fov.heightDeg >= plan.requiredWidthDeg * 1.08);
  if (!coversComfortably) return "tight";
  const anyTight = plan.targets.some((item) => item.status === "tight");
  return anyTight ? "tight" : "fits";
}

export function asterismFitLabel(fit: AsterismFitKind): string {
  switch (fit) {
    case "fits":
      return "Fits FOV";
    case "tight":
      return "Tight fit";
    case "needs_wider":
      return "Needs wider FOV";
    default: {
      const unexpected: never = fit;
      return unexpected;
    }
  }
}

export function asterismFitHint(fit: AsterismFitKind, plan: CollagePlan): string {
  const need = `${plan.requiredWidthDeg.toFixed(1)}° × ${plan.requiredHeightDeg.toFixed(1)}°`;
  const have = `${plan.frameWidthDeg.toFixed(1)}° × ${plan.frameHeightDeg.toFixed(1)}°`;
  switch (fit) {
    case "fits":
      return `The pattern fits the active field (${have}) with room to spare. Required about ${need}.`;
    case "tight":
      return `It nearly fills the frame. Required about ${need}; you have ${have}. Leave a little padding.`;
    case "needs_wider":
      return `This asterism needs about ${need}. Your current FOV is ${have} — use a wider optic or open it in Collage.`;
    default: {
      const unexpected: never = fit;
      return unexpected;
    }
  }
}

/**
 * Plate FOV for asterism framing: collage baseline, then a little extra zoom-out
 * when the pattern fits or is tight so the whole stick figure stays readable.
 */
export function asterismPlateFovDeg(plan: AsterismFramePlan): number {
  const base = collagePlateFovDeg(plan.collage);
  const extra =
    plan.fit === "tight" ? 1.22 : plan.fit === "fits" ? 1.14 : 1.06;
  return Math.min(20, Math.max(0.2, base * extra));
}

export function asterismStarsToCollageTargets(
  stars: Array<{ id: string; name: string; raDeg: number; decDeg: number }>,
): CollageTargetInput[] {
  return stars.map((star) => ({
    id: star.id,
    name: star.name,
    raDeg: star.raDeg,
    decDeg: star.decDeg,
  }));
}
