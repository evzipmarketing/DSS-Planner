import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CollageTargetInput } from "@dss/core";

export const ASTERISM_COLLAGE_SEED_KEY = "dss-planner.asterism-collage-seed.v1";

export type AsterismCollageSeed = {
  asterismId: string;
  name: string;
  targets: CollageTargetInput[];
};

export async function writeAsterismCollageSeed(seed: AsterismCollageSeed): Promise<void> {
  try {
    await AsyncStorage.setItem(ASTERISM_COLLAGE_SEED_KEY, JSON.stringify(seed));
  } catch {
    // ignore storage failures
  }
}

export async function consumeAsterismCollageSeed(): Promise<AsterismCollageSeed | null> {
  try {
    const raw = await AsyncStorage.getItem(ASTERISM_COLLAGE_SEED_KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(ASTERISM_COLLAGE_SEED_KEY);
    const parsed = JSON.parse(raw) as AsterismCollageSeed;
    if (!parsed?.name || !Array.isArray(parsed.targets) || parsed.targets.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}
