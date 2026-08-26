/**
 * Faction power hierarchy (per user request): every faction sits at one of 6 ranks, weakest to strongest.
 * A weaker-tier faction is only slightly cheaper and slightly quicker to build (per user request: "a bit"),
 * while a stronger-tier faction's units and buildings hit meaningfully harder and survive meaningfully
 * longer — enough that, per user request, one stronger-tier unit beats one weaker-tier unit in a straight
 * fight and then, against a second weaker-tier unit, gets it down to roughly half health before finally
 * dying itself.
 *
 * Ranking (weakest -> strongest), chosen from what the roster already leans toward thematically and
 * statistically: Umbral Voidkin (shadow speed) < Verdant Wilds (fast-growing nature) < Solari Archons
 * (passive/automatic economy, no harvester micro — already the lowest basic-tier hp in the game) <
 * Cyber-Nexus (kept as the unscaled baseline — prior to this system it was simply "the default faction") <
 * Pyroliths (already reads aggressive/hard-hitting for its cost) < Frost-Forged (already the roster's
 * priciest, slowest, tankiest basic tier by a wide margin — a natural top anchor).
 *
 * The math: "beats one, leaves a second at ~50% hp" is a specific outcome, not just "1.5x stronger" taken
 * literally — solving for it gives the real per-tier multiplier. Let a stronger unit have hp and dps each
 * k times a weaker unit's. Fighting weak unit #1, the strong unit spends time hp_weak/(k*dps_weak) killing
 * it, taking dps_weak * that time = hp_weak/k damage in return, leaving it at hp_weak*(k - 1/k). Against a
 * full-health weak unit #2, it then deals k*dps_weak times the time it has left before dying (that
 * remaining hp / dps_weak) = hp_weak*(k^2 - 1) damage before going down. Setting that equal to half of
 * hp_weak (per user request) gives k^2 - 1 = 0.5, i.e. k = sqrt(1.5) ≈ 1.225 — not 1.5. (A flat 1.5x per
 * adjacent tier, chained across all 6 tiers, would make the top tier ~7.6x the bottom tier's raw power;
 * sqrt(1.5) keeps that same per-step feel while landing the full 6-tier spread around a much more playable
 * ~2.8x.)
 */
export const FACTION_TIER: Record<string, number> = {
  'umbral-voidkin': 1,
  'verdant-wilds': 2,
  'solari-archons': 3,
  'cyber-nexus': 4,
  pyroliths: 5,
  'frost-forged': 6,
};

/** Cyber-Nexus's rank — every stat in units.ts/buildings.ts is written at this faction's tier and scaled from there, so its numbers stay exactly as authored (multiplier 1). */
const BASELINE_TIER = 4;

/** Combat power (hp and damage) per adjacent tier — see the derivation above. */
const POWER_STEP = Math.sqrt(1.5);
/** Cost and build time per adjacent tier — deliberately much shallower than the power step ("a bit" cheaper/quicker, per user request), so a weak-tier faction's edge is tempo, not raw efficiency. */
const COST_STEP = 1.08;
const BUILD_TIME_STEP = 1.05;

function tierOffset(factionId: string): number {
  return (FACTION_TIER[factionId] ?? BASELINE_TIER) - BASELINE_TIER;
}

export function tierPowerMultiplier(factionId: string): number {
  return POWER_STEP ** tierOffset(factionId);
}

export function tierCostMultiplier(factionId: string): number {
  return COST_STEP ** tierOffset(factionId);
}

export function tierBuildTimeMultiplier(factionId: string): number {
  return BUILD_TIME_STEP ** tierOffset(factionId);
}
