import type { BuildingRole } from '../config/buildings';
import { soundManager } from '../game/SoundManager';

export interface HUDUnitDef {
  unitId: string;
  name: string;
  costLabel: string;
  /** Compact power readout ("❤90 ⚔18 ×2"), empty for non-combat units (harvesters). Units are pre-sorted strongest-first by the caller. */
  statsLabel: string;
  /** Flavor/abilities text (UnitConfig.role, e.g. "heavy infantry - electric"). */
  abilityLabel: string;
}

export interface HUDCallbacks {
  onBeginPlaceBuilding: (role: BuildingRole) => void;
  onQueueUnit: (role: BuildingRole, unitId: string) => void;
  onSetRallyPoint: (role: BuildingRole) => void;
  onClearRallyPoint: (role: BuildingRole) => void;
  onMergeBuildings: () => void;
}

export interface HUDPanelState {
  role: BuildingRole;
  buildingName: string;
  prebuilt: boolean;
  built: boolean;
  placementActive: boolean;
  constructionProgress: number | null;
  buildCostLabel: string;
  canAffordBuilding: boolean;
  /** Full building data shown in-game (per user request), not just its build cost. */
  hp: number;
  maxHp: number;
  visionRadius: number;
  units: HUDUnitDef[];
  unitAffordability: Record<string, boolean>;
  queueLength: number;
  queueProgress: number | null;
  queueFull: boolean;
  hasRallyPoint: boolean;
  rallyArmed: boolean;
  showMergeOption: boolean;
  mergeCostLabel: string;
  canAffordMerge: boolean;
}

export interface HUDState {
  coreEnergy: number;
  factionResource: number;
  factionResourceLabel: string;
  unitCount: number;
  supplyUsed: number;
  panels: HUDPanelState[];
}

const TILE_SIZE = 56;

function shortLabel(name: string): string {
  // "Nexus Core" -> "Core", "Cyber-Forge" -> "Forge", "EMP Arc Turret" -> "Turret" — last word reads best on a small tile.
  const words = name.split(/[\s-]+/);
  return words[words.length - 1];
}

interface TileElements {
  tile: HTMLButtonElement;
  progressRing: HTMLDivElement;
  queueBadge: HTMLDivElement;
  label: HTMLDivElement;
}

interface TrayElements {
  tray: HTMLDivElement;
  title: HTMLDivElement;
  statsLine: HTMLDivElement;
  buildRow: HTMLButtonElement;
  queueLabel: HTMLDivElement;
  unitsRow: HTMLDivElement;
  unitButtons: Map<string, HTMLButtonElement>;
  rallySetBtn: HTMLButtonElement;
  rallyClearBtn: HTMLButtonElement;
  mergeBtn: HTMLButtonElement;
}

/**
 * Mobile-RTS-style bottom-center action bar: a slim row of building tiles
 * (per §research into Boom Beach / Clash-style build menus — only the most
 * urgent info stays persistent) with one collapsible tray above the bar,
 * opened by tapping a tile, instead of every building's full panel being
 * permanently expanded and covering the screen.
 */
export class HUD {
  private readonly coreEnergyEl: HTMLSpanElement;
  private readonly factionResourceEl: HTMLSpanElement;
  private readonly supplyEl: HTMLSpanElement;
  private readonly statusEl: HTMLDivElement;
  private readonly selectionEl: HTMLDivElement;
  private readonly convergeButton: HTMLButtonElement;
  private readonly tiles = new Map<BuildingRole, TileElements>();
  private readonly trays = new Map<BuildingRole, TrayElements>();
  private readonly callbacks: HUDCallbacks;
  private openRole: BuildingRole | null = null;

  constructor(container: HTMLElement, roles: BuildingRole[], callbacks: HUDCallbacks) {
    this.callbacks = callbacks;
    const root = document.createElement('div');
    root.style.cssText = `
      position: absolute; top: 12px; left: 12px; right: 12px;
      display: flex; justify-content: space-between; align-items: flex-start;
      font-family: 'Segoe UI', Roboto, sans-serif; color: #dff3ff; pointer-events: none;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8); user-select: none;
    `;

    const resourceBar = document.createElement('div');
    resourceBar.style.cssText = `
      background: rgba(10,16,24,0.75); border: 1px solid #2ea3ff55;
      border-radius: 6px; padding: 10px 16px; font-size: 15px;
      display: flex; gap: 22px; pointer-events: auto;
    `;
    this.coreEnergyEl = document.createElement('span');
    this.factionResourceEl = document.createElement('span');
    this.supplyEl = document.createElement('span');
    this.supplyEl.style.color = '#9fd8ff';
    resourceBar.append(this.coreEnergyEl, this.factionResourceEl, this.supplyEl);
    root.appendChild(resourceBar);

    this.statusEl = document.createElement('div');
    this.statusEl.style.cssText =
      'background: rgba(10,16,24,0.75); border-radius: 4px; padding: 4px 10px; font-size: 12px; color: #9fd8ff; min-height: 14px; pointer-events: none;';
    root.appendChild(this.statusEl);
    container.appendChild(root);

    this.selectionEl = document.createElement('div');
    this.selectionEl.style.cssText = `
      position: absolute; bottom: 12px; left: 12px; max-width: 320px;
      background: rgba(10,16,24,0.75); border: 1px solid #2ea3ff55;
      border-radius: 6px; padding: 8px 14px; font-size: 13px; color: #dff3ff;
      font-family: 'Segoe UI', Roboto, sans-serif; text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      pointer-events: none; display: none; user-select: none;
    `;
    container.appendChild(this.selectionEl);

    this.convergeButton = document.createElement('button');
    this.convergeButton.style.cssText = `
      position: absolute; bottom: 52px; left: 12px; max-width: 320px;
      font-size: 13px; color: #0b0d10; font-weight: 700; text-align: left;
      background: linear-gradient(135deg, #9fe8ff, #4fc3ff); border: 1px solid #dff3ff;
      border-radius: 6px; padding: 12px 14px; cursor: pointer; display: none;
      box-shadow: 0 0 14px #4fc3ffaa; touch-action: manipulation; min-height: 40px;
    `;
    container.appendChild(this.convergeButton);

    // --- Bottom-center building bar + one shared tray slot above it ---
    const bottomCenter = document.createElement('div');
    bottomCenter.style.cssText = `
      position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
      display: flex; flex-direction: column-reverse; align-items: center; gap: 8px;
    `;
    container.appendChild(bottomCenter);

    const tileRow = document.createElement('div');
    tileRow.style.cssText = 'display: flex; gap: 8px; pointer-events: auto;';
    bottomCenter.appendChild(tileRow);

    const trayHost = document.createElement('div');
    trayHost.style.cssText = 'pointer-events: auto;';
    bottomCenter.appendChild(trayHost);

    for (const role of roles) {
      const { tileEl, tileParts } = this.buildTile(role);
      tileRow.appendChild(tileEl);
      this.tiles.set(role, tileParts);

      const trayParts = this.buildTray(role, callbacks);
      trayParts.tray.style.display = 'none';
      trayHost.appendChild(trayParts.tray);
      this.trays.set(role, trayParts);
    }
  }

  private buildTile(role: BuildingRole): { tileEl: HTMLButtonElement; tileParts: TileElements } {
    const tile = document.createElement('button');
    tile.style.cssText = `
      position: relative; width: ${TILE_SIZE}px; height: ${TILE_SIZE}px;
      background: rgba(10,16,24,0.85); border: 2px solid #2ea3ff55; border-radius: 10px;
      cursor: pointer; touch-action: manipulation; padding: 0;
    `;
    tile.addEventListener('click', () => {
      soundManager.playUIClick();
      this.openRole = this.openRole === role ? null : role;
      this.applyOpenState();
    });

    const progressRing = document.createElement('div');
    progressRing.style.cssText = `
      position: absolute; inset: -2px; border-radius: 10px; pointer-events: none;
      border: 2px solid transparent;
    `;
    tile.appendChild(progressRing);

    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 600; color: #dff3ff; text-align: center; padding: 2px;
      line-height: 1.15; text-shadow: 0 1px 2px rgba(0,0,0,0.9);
    `;
    tile.appendChild(label);

    const queueBadge = document.createElement('div');
    queueBadge.style.cssText = `
      position: absolute; top: -6px; right: -6px; min-width: 16px; height: 16px; border-radius: 8px;
      background: #4fc3ff; color: #0b0d10; font-size: 10px; font-weight: 700;
      display: none; align-items: center; justify-content: center; padding: 0 3px;
    `;
    tile.appendChild(queueBadge);

    return { tileEl: tile, tileParts: { tile, progressRing, queueBadge, label } };
  }

  private buildTray(role: BuildingRole, callbacks: HUDCallbacks): TrayElements {
    const tray = document.createElement('div');
    tray.style.cssText = `
      background: rgba(10,16,24,0.9); border: 1px solid #2ea3ff55; border-radius: 8px;
      padding: 8px; display: flex; flex-direction: column; gap: 4px; width: 220px;
      max-height: 46vh; overflow-y: auto;
    `;

    const title = document.createElement('div');
    title.style.cssText = 'font-size: 11px; font-weight: 700; color: #9fd8ff;';
    tray.appendChild(title);

    const statsLine = document.createElement('div');
    statsLine.style.cssText = 'font-size: 10px; color: #dff3ffcc;';
    tray.appendChild(statsLine);

    const buildRow = document.createElement('button');
    styleCompactButton(buildRow);
    buildRow.addEventListener('click', () => callbacks.onBeginPlaceBuilding(role));
    tray.appendChild(buildRow);

    const queueLabel = document.createElement('div');
    queueLabel.style.cssText = 'font-size: 10px; color: #9fd8ffcc;';
    tray.appendChild(queueLabel);

    // Two-column grid, not a stacked column, so a building's usual 2 producible units take one short row instead of two — the single biggest driver of the tray's old height.
    const unitsRow = document.createElement('div');
    unitsRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 4px;';
    tray.appendChild(unitsRow);

    const rallyRow = document.createElement('div');
    rallyRow.style.cssText = 'display: flex; gap: 4px;';
    const rallySetBtn = document.createElement('button');
    styleCompactButton(rallySetBtn);
    rallySetBtn.style.flex = '1';
    rallySetBtn.addEventListener('click', () => callbacks.onSetRallyPoint(role));
    const rallyClearBtn = document.createElement('button');
    styleCompactButton(rallyClearBtn);
    rallyClearBtn.textContent = '✕';
    rallyClearBtn.style.flex = '0 0 32px';
    rallyClearBtn.style.textAlign = 'center';
    rallyClearBtn.addEventListener('click', () => callbacks.onClearRallyPoint(role));
    rallyRow.append(rallySetBtn, rallyClearBtn);
    tray.appendChild(rallyRow);

    const mergeBtn = document.createElement('button');
    styleCompactButton(mergeBtn);
    mergeBtn.style.background = 'linear-gradient(135deg, #ffd39f, #ff9f4f)';
    mergeBtn.style.color = '#241505';
    mergeBtn.style.fontWeight = '700';
    mergeBtn.addEventListener('click', () => callbacks.onMergeBuildings());
    tray.appendChild(mergeBtn);

    return { tray, title, statsLine, buildRow, queueLabel, unitsRow, unitButtons: new Map(), rallySetBtn, rallyClearBtn, mergeBtn };
  }

  /** Closes whichever tray is open. Called once placement/rally mode starts, since at that point the player needs a clear view of the ground to click on — the tray would otherwise sit directly over the exact area (often the player's own base) they need to click. */
  closeTray(): void {
    this.openRole = null;
    this.applyOpenState();
  }

  /** Opens a building's tray directly — used when the player clicks the building's own 3D model in the scene, not just its bottom-bar tile, so "click the building to see its data" works either way. */
  openTray(role: BuildingRole): void {
    this.openRole = role;
    this.applyOpenState();
  }

  private applyOpenState(): void {
    for (const [role, tray] of this.trays) {
      tray.tray.style.display = this.openRole === role ? 'flex' : 'none';
    }
    for (const [role, tile] of this.tiles) {
      tile.tile.style.borderColor = this.openRole === role ? '#9fe8ff' : '#2ea3ff55';
    }
  }

  update(state: HUDState): void {
    this.coreEnergyEl.textContent = `⚡ Core Energy: ${Math.floor(state.coreEnergy)}`;
    this.factionResourceEl.textContent = `◆ ${state.factionResourceLabel}: ${Math.floor(state.factionResource)}`;
    this.supplyEl.textContent = `Supply: ${state.supplyUsed} (${state.unitCount} units)`;

    for (const panelState of state.panels) {
      this.updateTile(panelState);
      this.updateTray(panelState);
    }
  }

  private updateTile(panelState: HUDPanelState): void {
    const tile = this.tiles.get(panelState.role);
    if (!tile) return;

    tile.label.textContent = shortLabel(panelState.buildingName);
    tile.tile.style.opacity = panelState.built || panelState.constructionProgress !== null ? '1' : '0.7';

    if (panelState.constructionProgress !== null) {
      const deg = Math.floor(panelState.constructionProgress * 360);
      tile.progressRing.style.border = 'none';
      tile.progressRing.style.background = `conic-gradient(#4fc3ff ${deg}deg, transparent ${deg}deg)`;
      tile.progressRing.style.opacity = '0.9';
    } else {
      tile.progressRing.style.background = 'none';
      tile.progressRing.style.border = panelState.built ? '2px solid #4fc3ff88' : '2px dashed #9fd8ff55';
    }

    if (panelState.queueLength > 0) {
      tile.queueBadge.style.display = 'flex';
      tile.queueBadge.textContent = String(panelState.queueLength);
    } else {
      tile.queueBadge.style.display = 'none';
    }
  }

  private updateTray(panelState: HUDPanelState): void {
    const tray = this.trays.get(panelState.role);
    if (!tray) return;

    tray.title.textContent = panelState.buildingName;
    tray.statsLine.textContent = panelState.built
      ? `❤ ${Math.ceil(panelState.hp)}/${panelState.maxHp} HP · 👁 ${panelState.visionRadius} vision`
      : `❤ ${panelState.maxHp} HP · 👁 ${panelState.visionRadius} vision (once built)`;

    if (panelState.prebuilt || panelState.built) {
      tray.buildRow.style.display = 'none';
    } else {
      tray.buildRow.style.display = 'block';
      if (panelState.constructionProgress !== null) {
        tray.buildRow.textContent = `Building… ${Math.floor(panelState.constructionProgress * 100)}%`;
        tray.buildRow.disabled = true;
      } else if (panelState.placementActive) {
        tray.buildRow.textContent = 'Click the ground to place (Esc to cancel)';
        tray.buildRow.disabled = false;
      } else {
        tray.buildRow.textContent = `Build ${panelState.buildingName} (${panelState.buildCostLabel})`;
        tray.buildRow.disabled = !panelState.canAffordBuilding;
      }
    }

    const built = panelState.built;
    tray.queueLabel.textContent =
      built && panelState.queueLength > 0
        ? `Queue: ${panelState.queueLength}${panelState.queueFull ? ' (full)' : ''} — building ${Math.floor((panelState.queueProgress ?? 0) * 100)}%`
        : '';

    // Rebuild the unit-button list only when the set of producible units actually changed (building fusion can change it mid-game).
    const currentIds = [...tray.unitButtons.keys()];
    const wantedIds = panelState.units.map((u) => u.unitId);
    if (currentIds.join(',') !== wantedIds.join(',')) {
      tray.unitsRow.innerHTML = '';
      tray.unitButtons.clear();
      for (const unit of panelState.units) {
        const btn = document.createElement('button');
        styleCompactButton(btn);
        btn.addEventListener('click', () => this.callbacks.onQueueUnit(panelState.role, unit.unitId));
        tray.unitsRow.appendChild(btn);
        tray.unitButtons.set(unit.unitId, btn);
      }
    }
    for (const unit of panelState.units) {
      const btn = tray.unitButtons.get(unit.unitId);
      if (!btn) continue;
      btn.style.display = built ? 'block' : 'none';
      btn.textContent = [unit.name, unit.statsLabel, unit.abilityLabel, unit.costLabel].filter(Boolean).join('\n');
      btn.disabled = panelState.queueFull || !panelState.unitAffordability[unit.unitId];
    }

    const canRally = built && panelState.units.length > 0;
    tray.rallySetBtn.style.display = canRally ? 'block' : 'none';
    tray.rallyClearBtn.style.display = canRally && panelState.hasRallyPoint ? 'block' : 'none';
    if (canRally) {
      tray.rallySetBtn.textContent = panelState.rallyArmed
        ? '🚩 Click ground (Esc)'
        : panelState.hasRallyPoint
          ? '🚩 Rally set'
          : '🚩 Set rally point';
    }

    tray.mergeBtn.style.display = panelState.showMergeOption ? 'block' : 'none';
    if (panelState.showMergeOption) {
      tray.mergeBtn.textContent = `⚡ Merge Buildings (${panelState.mergeCostLabel})`;
      tray.mergeBtn.disabled = !panelState.canAffordMerge;
    }

    for (const btn of [tray.buildRow, ...tray.unitButtons.values(), tray.rallySetBtn, tray.rallyClearBtn, tray.mergeBtn]) {
      if (btn.style.display === 'none') continue;
      btn.style.opacity = btn.disabled ? '0.5' : '1';
      btn.style.cursor = btn.disabled ? 'default' : 'pointer';
    }
  }

  setStatus(text: string): void {
    this.statusEl.textContent = text;
  }

  setSelectionInfo(text: string): void {
    this.selectionEl.style.display = text ? 'block' : 'none';
    this.selectionEl.textContent = text;
  }

  /** Shows/hides the Convergence action for the current selection. Pass null when no recipe matches. */
  setConvergenceOption(option: { label: string; onClick: () => void } | null): void {
    if (!option) {
      this.convergeButton.style.display = 'none';
      return;
    }
    this.convergeButton.style.display = 'block';
    this.convergeButton.textContent = option.label;
    this.convergeButton.onclick = option.onClick;
  }
}

function styleCompactButton(button: HTMLButtonElement): void {
  button.style.cssText = `
    font: inherit; font-size: 11px; color: #dff3ff; text-align: left;
    background: rgba(46,163,255,0.15); border: 1px solid #2ea3ff88;
    border-radius: 4px; padding: 6px 8px; cursor: pointer; line-height: 1.3;
    min-height: 26px; touch-action: manipulation; white-space: pre-line;
  `;
  button.addEventListener('click', () => soundManager.playUIClick());
  button.addEventListener('mouseenter', () => {
    if (!button.disabled) button.style.background = 'rgba(46,163,255,0.32)';
  });
  button.addEventListener('mouseleave', () => {
    if (!button.disabled) button.style.background = 'rgba(46,163,255,0.15)';
  });
}
