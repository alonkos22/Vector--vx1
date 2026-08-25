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
};
