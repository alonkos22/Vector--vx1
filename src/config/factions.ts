/** Per-faction identity: display name, faction-unique resource label, colors, home biome. */
export interface FactionConfig {
  id: string;
  name: string;
  /** Display label for the faction-unique resource (Data-Flux, Core-Ash, ...). */
  factionResourceName: string;
  colorPrimary: number;
  colorSecondary: number;
  biomeId: string;
}

export const FACTIONS: Record<string, FactionConfig> = {
  'cyber-nexus': {
    id: 'cyber-nexus',
    name: 'Cyber-Nexus',
    factionResourceName: 'Data-Flux',
    colorPrimary: 0x2ea3ff,
    colorSecondary: 0xd8e6f0,
    biomeId: 'cyber-nexus',
  },
};
