/**
 * Per-faction home biome ground materials, per design doc §5.
 * Pure data — adding a faction's biome (Milestone 9) means adding an
 * entry here, never touching the terrain rendering code.
 */
export interface BiomeConfig {
  id: string;
  name: string;
  /** Base ground color. */
  groundColor: number;
  /** Glowing accent color running through the ground (data-veins, lava
   * cracks, metal veins under ice, etc). Null = no accent pattern. */
  veinColor: number | null;
  roughness: number;
  metalness: number;
}

export const BIOMES: Record<string, BiomeConfig> = {
  'cyber-nexus': {
    id: 'cyber-nexus',
    name: 'Metal Plains',
    groundColor: 0x888e96,
    veinColor: 0x2ea3ff,
    roughness: 0.35,
    metalness: 0.75,
  },
  pyroliths: {
    id: 'pyroliths',
    name: 'Lava Fields',
    groundColor: 0x2a2016,
    veinColor: 0xff6a1a,
    roughness: 0.85,
    metalness: 0.1,
  },
  'solari-archons': {
    id: 'solari-archons',
    name: 'Open Plains',
    groundColor: 0xe8e4d8,
    veinColor: 0xf4c542,
    roughness: 0.5,
    metalness: 0.15,
  },
  'frost-forged': {
    id: 'frost-forged',
    name: 'Frozen Peaks',
    groundColor: 0xc9dde3,
    veinColor: 0x4fd8e0,
    roughness: 0.4,
    metalness: 0.2,
  },
  'verdant-wilds': {
    id: 'verdant-wilds',
    name: 'Overgrown Thicket',
    groundColor: 0x2a3d1f,
    veinColor: 0x7fd94f,
    roughness: 0.75,
    metalness: 0.05,
  },
  'umbral-voidkin': {
    id: 'umbral-voidkin',
    name: 'Shattered Rift',
    groundColor: 0x1a1220,
    veinColor: 0xb84fd9,
    roughness: 0.3,
    metalness: 0.25,
  },
};
