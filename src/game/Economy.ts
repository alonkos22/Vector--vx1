/** Tracks the two-currency economy for one player: universal Core Energy + a faction-unique resource. */
export class PlayerEconomy {
  coreEnergy: number;
  factionResource: number;

  constructor(startingCoreEnergy = 0, startingFactionResource = 0) {
    this.coreEnergy = startingCoreEnergy;
    this.factionResource = startingFactionResource;
  }

  canAfford(costCoreEnergy: number, costFactionResource: number): boolean {
    return this.coreEnergy >= costCoreEnergy && this.factionResource >= costFactionResource;
  }

  spend(costCoreEnergy: number, costFactionResource: number): void {
    this.coreEnergy -= costCoreEnergy;
    this.factionResource -= costFactionResource;
  }

  addCoreEnergy(amount: number): void {
    this.coreEnergy += amount;
  }

  addFactionResource(amount: number): void {
    this.factionResource += amount;
  }
}
