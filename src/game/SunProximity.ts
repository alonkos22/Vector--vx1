export type SunProximityStage = 'stable' | 'converging' | 'critical';

export interface SunProximitySnapshot {
  stage: SunProximityStage;
  /** 0..1 across the whole match. */
  progress: number;
  /** 0..1 within the current stage only, for smoother per-stage interpolation. */
  stageProgress: number;
}

const CONVERGING_AT = 0.4;
const CRITICAL_AT = 0.8;

/**
 * Tracks match-time progress through the three Sun Proximity stages (§5):
 * Stable (0-40%), Converging (40-80%), Critical (80-100%). The design doc
 * doesn't specify a match length, so `totalDurationSec` is a tunable
 * homebrew default, not canon.
 */
export class SunProximity {
  private readonly totalDurationSec: number;
  private elapsed = 0;

  constructor(totalDurationSec: number) {
    this.totalDurationSec = totalDurationSec;
  }

  update(dt: number): void {
    this.elapsed = Math.min(this.elapsed + dt, this.totalDurationSec);
  }

  snapshot(): SunProximitySnapshot {
    const progress = this.elapsed / this.totalDurationSec;
    let stage: SunProximityStage = 'stable';
    let stageStart = 0;
    let stageEnd = CONVERGING_AT;
    if (progress >= CRITICAL_AT) {
      stage = 'critical';
      stageStart = CRITICAL_AT;
      stageEnd = 1;
    } else if (progress >= CONVERGING_AT) {
      stage = 'converging';
      stageStart = CONVERGING_AT;
      stageEnd = CRITICAL_AT;
    }
    const stageProgress = (progress - stageStart) / (stageEnd - stageStart);
    return { stage, progress, stageProgress };
  }
}
