import type { CollageTargetInput } from "@dss/core";

export const ASTERISM_COLLAGE_SEED_KEY = "dss-planner.asterism-collage-seed.v1";

export type AsterismCollageSeed = {
  asterismId: string;
  name: string;
  targets: CollageTargetInput[];
};

export function writeAsterismCollageSeed(seed: AsterismCollageSeed): void {
  try {
    window.sessionStorage.setItem(ASTERISM_COLLAGE_SEED_KEY, JSON.stringify(seed));
  } catch {
    // ignore storage failures
  }
}

export function consumeAsterismCollageSeed(): AsterismCollageSeed | null {
  try {
    const raw = window.sessionStorage.getItem(ASTERISM_COLLAGE_SEED_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(ASTERISM_COLLAGE_SEED_KEY);
    const parsed = JSON.parse(raw) as AsterismCollageSeed;
    if (!parsed?.name || !Array.isArray(parsed.targets) || parsed.targets.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}
