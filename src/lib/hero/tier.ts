import { TIER } from "./constants";

export type Tier = "full" | "lite" | "still";

export interface TierEnv {
  reducedMotion: boolean;
  saveData?: boolean | undefined;
  hardwareConcurrency?: number | undefined;
  deviceMemory?: number | undefined;
  /** Probes WebGL2 on a throwaway canvas. Only called when the earlier rows did not decide. */
  webgl2: () => boolean;
}

/** Spec 5: the first matching row wins. An undefined measure never counts as weak. */
export function pickTier(env: TierEnv): Tier {
  if (env.reducedMotion) return "still";
  if (env.saveData === true) return "still";
  const cores = env.hardwareConcurrency;
  const memory = env.deviceMemory;
  if (
    (cores !== undefined && cores <= TIER.stillCores) ||
    (memory !== undefined && memory <= TIER.stillMemory)
  ) {
    return "still";
  }
  if (!env.webgl2()) return "lite";
  if (
    cores !== undefined &&
    cores <= TIER.liteCores &&
    memory !== undefined &&
    memory <= TIER.liteMemory
  ) {
    return "lite";
  }
  return "full";
}

/** Whole numbers only: a fractional ratio makes a 3 px lattice beat (spec 3). */
export function pickDpr(devicePixelRatio: number): number {
  return Math.max(1, Math.min(2, Math.floor(devicePixelRatio || 1)));
}
