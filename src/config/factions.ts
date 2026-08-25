/** Attack VFX flavor key (§6), dispatched by EffectManager.spawnAttackHit. */
export type AttackVfxStyle = 'laser' | 'lava-arc' | 'light-beam' | 'projectile';

/** Per-faction identity: display name, resource label, colors, home biome, and economy shape. */
export interface FactionConfig {
  id: string;
  name: string;
  /** Display label for the faction-unique resource (Data-Flux, Core-Ash, ...). */
  factionResourceName: string;
  colorPrimary: number;
  colorSecondary: number;
  biomeId: string;
  /** The faction's fusion mechanic name (§3), e.g. "Synchronization". */
  convergenceMechanicName: string;
  attackVfxStyle: AttackVfxStyle;
  /**
   * Most factions gather via a harvester unit (its id given here). Solari
   * Archons has none — `harvesterUnitId: null` — and both resources trickle
   * in passively instead (`economyMode: 'passive'`), per §2.3's explicit
   * "no harvester unit at all" design.
   */
  economyMode: 'harvester' | 'passive';
  harvesterUnitId: string | null;
  /** Only meaningful when economyMode is 'passive'. */
  passiveCoreEnergyPerSec?: number;
  passiveFactionResourcePerSec?: number;
}

export const FACTIONS: Record<string, FactionConfig> = {
  'cyber-nexus': {
    id: 'cyber-nexus',
    name: 'Cyber-Nexus',
    factionResourceName: 'Data-Flux',
    colorPrimary: 0x2ea3ff,
    colorSecondary: 0xd8e6f0,
    biomeId: 'cyber-nexus',
    convergenceMechanicName: 'Synchronization',
    attackVfxStyle: 'laser',
    economyMode: 'harvester',
    harvesterUnitId: 'flux-harvester',
  },
  pyroliths: {
    id: 'pyroliths',
    name: 'Pyroliths',
    factionResourceName: 'Core-Ash',
    colorPrimary: 0xff6a1a,
    colorSecondary: 0x1a1410,
    biomeId: 'pyroliths',
    convergenceMechanicName: 'Conglomeration',
    attackVfxStyle: 'lava-arc',
    economyMode: 'harvester',
    harvesterUnitId: 'cinder-grub',
  },
  'solari-archons': {
    id: 'solari-archons',
    name: 'Solari Archons',
    factionResourceName: 'Solar Radiance',
    colorPrimary: 0xf4c542,
    colorSecondary: 0x9b5de5,
    biomeId: 'solari-archons',
    convergenceMechanicName: 'Ascension',
    attackVfxStyle: 'light-beam',
    economyMode: 'passive',
    harvesterUnitId: null,
    passiveCoreEnergyPerSec: 1.2,
    passiveFactionResourcePerSec: 3.5,
  },
  'frost-forged': {
    id: 'frost-forged',
    name: 'Frost-Forged',
    factionResourceName: 'Ferrite Ore',
    colorPrimary: 0xb5651d,
    colorSecondary: 0x4fd8e0,
    biomeId: 'frost-forged',
    convergenceMechanicName: 'Forge-Weld',
    attackVfxStyle: 'projectile',
    economyMode: 'harvester',
    harvesterUnitId: 'rustling',
  },
};
