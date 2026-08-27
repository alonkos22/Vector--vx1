import type { BuildingRole } from '../config/buildings';
import { soundManager } from '../game/SoundManager';

/** Full breakdown shown in the long-press detail popup (per user request): cost, resources, HP, attack,
 * class strengths/weaknesses, speed, and — for units that fuse — a picture of the fusion result. */
export interface HUDDetailInfo {
  title: string;
  iconUrl: string;
  subtitle: string;
  lines: string[];
  fusion?: { iconUrl: string; label: string } | null;
}

export interface HUDUnitDef {
  unitId: string;
  name: string;
  costLabel: string;
  /** Compact power readout ("❤90 ⚔18 ×2"), empty for non-combat units (harvesters). Units are pre-sorted strongest-first by the caller. */
  statsLabel: string;
  /** Flavor/abilities text (UnitConfig.role, e.g. "heavy infantry - electric"). */
  abilityLabel: string;
  /** PNG data URL of the unit's actual in-game model, rendered by IconRenderer (per user request: a picture next to its name on the button used to build it). */
  iconUrl: string;
  /** Long-press detail popup content. */
  detail: HUDDetailInfo;
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
  /** PNG data URL of the building's actual in-game model, rendered by IconRenderer. */
  iconUrl: string;
  /** Long-press detail popup content. */
  detail: HUDDetailInfo;
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
  /** Faction's primary color (hex, e.g. 0x2ea3ff) — tints the faction-resource icon so it reads as "this race's material", per user request for graphic resource icons. */
  factionResourceColor: number;
  unitCount: number;
  supplyUsed: number;
  panels: HUDPanelState[];
}

/** Live version of HUDDetailInfo for the always-on portrait panel — same cost/attack/class breakdown, plus the unit's current hp so its health bar actually moves as it takes damage (the long-press popup only ever shows static max values). */
export interface HUDPortraitInfo extends HUDDetailInfo {
  hp: number;
  maxHp: number;
}

const TILE_SIZE = 56;

function hexColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Small inline SVG icons for the resource bar (per user request: graphic icons alongside the text, not replacing it). Self-contained strings — no external assets, no build-time cost. */
function coreEnergyIconSvg(): string {
  return `<svg viewBox="0 0 24 24" width="18" height="18"><polygon points="12,1 22,7 22,17 12,23 2,17 2,7" fill="#173a52" stroke="#4fc3ff" stroke-width="1.5"/><polygon points="13,4 7,13 11,13 10,20 17,10 13,10" fill="#9fe8ff"/></svg>`;
}
function factionResourceIconSvg(color: number): string {
  const fill = hexColor(color);
  return `<svg viewBox="0 0 24 24" width="18" height="18"><polygon points="12,2 20,9 16,22 8,22 4,9" fill="${fill}" stroke="#dff3ff" stroke-width="1" opacity="0.95"/><polygon points="12,2 20,9 12,12" fill="#ffffff" opacity="0.35"/></svg>`;
}

function shortLabel(name: string): string {
  // "Nexus Core" -> "Core", "Cyber-Forge" -> "Forge", "EMP Arc Turret" -> "Turret" — last word reads best on a small tile.
  const words = name.split(/[\s-]+/);
  return words[words.length - 1];
}

interface TileElements {
  tile: HTMLButtonElement;
  progressRing: HTMLDivElement;
  queueBadge: HTMLDivElement;
  icon: HTMLImageElement;
  label: HTMLDivElement;
  /** Latest detail content for this tile's building — read by the long-press handler at press time, so it's never stale even though the handler was attached once at tile creation. */
  detail: HUDDetailInfo | null;
}

interface UnitButtonElements {
  btn: HTMLButtonElement;
  icon: HTMLImageElement;
  text: HTMLDivElement;
  detail: HUDDetailInfo | null;
}

interface TrayElements {
  tray: HTMLDivElement;
  title: HTMLDivElement;
  titleIcon: HTMLImageElement;
  statsLine: HTMLDivElement;
  buildRow: HTMLButtonElement;
  queueLabel: HTMLDivElement;
  unitsRow: HTMLDivElement;
  unitButtons: Map<string, UnitButtonElements>;
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
  private readonly factionResourceIcon: HTMLSpanElement;
  private lastFactionResourceColor: number | null = null;
  private readonly supplyEl: HTMLSpanElement;
  private readonly statusEl: HTMLDivElement;
  private readonly selectionEl: HTMLDivElement;

  // --- Portrait panel (per user request: a live picture + stats for the single selected unit) ---
  private readonly portraitEl: HTMLDivElement;
  private readonly portraitIcon: HTMLImageElement;
  private readonly portraitTitle: HTMLDivElement;
  private readonly portraitSubtitle: HTMLDivElement;
  private readonly portraitHpBarFill: HTMLDivElement;
  private readonly portraitHpText: HTMLDivElement;
  private readonly portraitLines: HTMLDivElement;
  private readonly portraitFusionRow: HTMLDivElement;
  private readonly portraitFusionIcon: HTMLImageElement;
  private readonly portraitFusionLabel: HTMLDivElement;

  private readonly convergeButton: HTMLButtonElement;
  private readonly tiles = new Map<BuildingRole, TileElements>();
  private readonly trays = new Map<BuildingRole, TrayElements>();
  private readonly callbacks: HUDCallbacks;
  private openRole: BuildingRole | null = null;

  // --- Long-press detail popup (per user request: full stats/matchup breakdown on demand) ---
  private readonly detailOverlay: HTMLDivElement;
  private readonly detailPanel: HTMLDivElement;
  private readonly detailIcon: HTMLImageElement;
  private readonly detailTitle: HTMLDivElement;
  private readonly detailSubtitle: HTMLDivElement;
  private readonly detailLines: HTMLDivElement;
  private readonly detailFusionRow: HTMLDivElement;
  private readonly detailFusionIcon: HTMLImageElement;
  private readonly detailFusionLabel: HTMLDivElement;

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
      display: flex; gap: 22px; align-items: center; pointer-events: auto;
    `;
    const coreEnergyIcon = document.createElement('span');
    coreEnergyIcon.innerHTML = coreEnergyIconSvg();
    coreEnergyIcon.style.cssText = 'display: inline-flex; margin-right: 6px; vertical-align: middle;';
    this.coreEnergyEl = document.createElement('span');
    const coreEnergyGroup = document.createElement('span');
    coreEnergyGroup.style.cssText = 'display: inline-flex; align-items: center;';
    coreEnergyGroup.append(coreEnergyIcon, this.coreEnergyEl);

    this.factionResourceIcon = document.createElement('span');
    this.factionResourceIcon.style.cssText = 'display: inline-flex; margin-right: 6px; vertical-align: middle;';
    this.factionResourceEl = document.createElement('span');
    const factionResourceGroup = document.createElement('span');
    factionResourceGroup.style.cssText = 'display: inline-flex; align-items: center;';
    factionResourceGroup.append(this.factionResourceIcon, this.factionResourceEl);

    this.supplyEl = document.createElement('span');
    this.supplyEl.style.color = '#9fd8ff';
    resourceBar.append(coreEnergyGroup, factionResourceGroup, this.supplyEl);
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

    // --- Portrait panel (per user request): a bigger, always-live picture of the single selected unit —
    // model, health bar, and the same cost/attack/class breakdown as the long-press popup, but with a
    // health bar that actually moves as the unit takes damage instead of a static max-hp line. Occupies the
    // same corner as the plain-text multi-selection summary; only one of the two is ever shown.
    this.portraitEl = document.createElement('div');
    this.portraitEl.style.cssText = `
      position: absolute; bottom: 12px; left: 12px; width: 240px;
      background: rgba(10,16,24,0.9); border: 1px solid #2ea3ff55; border-radius: 8px;
      padding: 10px; font-family: 'Segoe UI', Roboto, sans-serif; color: #dff3ff;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8); pointer-events: none; display: none; user-select: none;
    `;
    container.appendChild(this.portraitEl);

    const portraitHeader = document.createElement('div');
    portraitHeader.style.cssText = 'display: flex; align-items: center; gap: 10px;';
    this.portraitIcon = document.createElement('img');
    this.portraitIcon.style.cssText = 'width: 56px; height: 56px; object-fit: contain; flex: none;';
    const portraitTitleCol = document.createElement('div');
    portraitTitleCol.style.cssText = 'flex: 1; min-width: 0;';
    this.portraitTitle = document.createElement('div');
    this.portraitTitle.style.cssText = 'font-size: 14px; font-weight: 700; color: #9fe8ff;';
    this.portraitSubtitle = document.createElement('div');
    this.portraitSubtitle.style.cssText = 'font-size: 10px; color: #dff3ffaa;';
    portraitTitleCol.append(this.portraitTitle, this.portraitSubtitle);
    portraitHeader.append(this.portraitIcon, portraitTitleCol);
    this.portraitEl.appendChild(portraitHeader);

    const hpRow = document.createElement('div');
    hpRow.style.cssText = 'margin-top: 6px;';
    const hpBarTrack = document.createElement('div');
    hpBarTrack.style.cssText = 'height: 8px; border-radius: 4px; background: rgba(255,255,255,0.15); overflow: hidden;';
    this.portraitHpBarFill = document.createElement('div');
    this.portraitHpBarFill.style.cssText = 'height: 100%; background: linear-gradient(90deg, #4fc3ff, #9fe8ff); width: 100%;';
    hpBarTrack.appendChild(this.portraitHpBarFill);
    this.portraitHpText = document.createElement('div');
    this.portraitHpText.style.cssText = 'font-size: 10px; color: #dff3ffcc; margin-top: 2px; text-align: right;';
    hpRow.append(hpBarTrack, this.portraitHpText);
    this.portraitEl.appendChild(hpRow);

    this.portraitLines = document.createElement('div');
    this.portraitLines.style.cssText = 'display: flex; flex-direction: column; gap: 3px; font-size: 10px; line-height: 1.4; margin-top: 6px;';
    this.portraitEl.appendChild(this.portraitLines);

    this.portraitFusionRow = document.createElement('div');
    this.portraitFusionRow.style.cssText = `
      display: flex; align-items: center; gap: 6px; margin-top: 6px; padding-top: 6px;
      border-top: 1px solid #2ea3ff33;
    `;
    this.portraitFusionIcon = document.createElement('img');
    this.portraitFusionIcon.style.cssText = 'width: 24px; height: 24px; object-fit: contain; flex: none;';
    this.portraitFusionLabel = document.createElement('div');
    this.portraitFusionLabel.style.cssText = 'font-size: 9px; color: #dff3ffcc; flex: 1;';
    this.portraitFusionRow.append(this.portraitFusionIcon, this.portraitFusionLabel);
    this.portraitEl.appendChild(this.portraitFusionRow);

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

    // --- Long-press detail popup: a centered modal, dismissed by tapping the dimmed backdrop or the close button ---
    this.detailOverlay = document.createElement('div');
    this.detailOverlay.style.cssText = `
      position: absolute; inset: 0; background: rgba(4,6,10,0.72); z-index: 90;
      display: none; align-items: center; justify-content: center; pointer-events: auto;
    `;
    this.detailOverlay.addEventListener('click', (e) => {
      if (e.target === this.detailOverlay) this.hideDetail();
    });
    container.appendChild(this.detailOverlay);

    this.detailPanel = document.createElement('div');
    this.detailPanel.style.cssText = `
      background: rgba(10,16,24,0.97); border: 1px solid #2ea3ff88; border-radius: 12px;
      padding: 16px; width: min(300px, 84vw); max-height: 78vh; overflow-y: auto;
      font-family: 'Segoe UI', Roboto, sans-serif; color: #dff3ff;
    `;
    this.detailOverlay.appendChild(this.detailPanel);

    const detailHeader = document.createElement('div');
    detailHeader.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';
    this.detailIcon = document.createElement('img');
    this.detailIcon.style.cssText = 'width: 48px; height: 48px; object-fit: contain; flex: none;';
    const titleCol = document.createElement('div');
    titleCol.style.cssText = 'flex: 1; min-width: 0;';
    this.detailTitle = document.createElement('div');
    this.detailTitle.style.cssText = 'font-size: 15px; font-weight: 700; color: #9fe8ff;';
    this.detailSubtitle = document.createElement('div');
    this.detailSubtitle.style.cssText = 'font-size: 11px; color: #dff3ffaa;';
    titleCol.append(this.detailTitle, this.detailSubtitle);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      flex: none; background: rgba(46,163,255,0.15); border: 1px solid #2ea3ff88; border-radius: 6px;
      color: #dff3ff; font-size: 13px; width: 26px; height: 26px; cursor: pointer; touch-action: manipulation;
    `;
    closeBtn.addEventListener('click', () => this.hideDetail());
    detailHeader.append(this.detailIcon, titleCol, closeBtn);
    this.detailPanel.appendChild(detailHeader);

    this.detailLines = document.createElement('div');
    this.detailLines.style.cssText = 'display: flex; flex-direction: column; gap: 4px; font-size: 12px; line-height: 1.5;';
    this.detailPanel.appendChild(this.detailLines);

    this.detailFusionRow = document.createElement('div');
    this.detailFusionRow.style.cssText = `
      display: flex; align-items: center; gap: 8px; margin-top: 10px; padding-top: 10px;
      border-top: 1px solid #2ea3ff33;
    `;
    this.detailFusionIcon = document.createElement('img');
    this.detailFusionIcon.style.cssText = 'width: 32px; height: 32px; object-fit: contain; flex: none;';
    this.detailFusionLabel = document.createElement('div');
    this.detailFusionLabel.style.cssText = 'font-size: 11px; color: #dff3ffcc; flex: 1;';
    this.detailFusionRow.append(this.detailFusionIcon, this.detailFusionLabel);
    this.detailPanel.appendChild(this.detailFusionRow);
  }

  private showDetail(detail: HUDDetailInfo): void {
    soundManager.playUIClick();
    this.detailIcon.src = detail.iconUrl;
    this.detailTitle.textContent = detail.title;
    this.detailSubtitle.textContent = detail.subtitle;
    this.detailLines.innerHTML = '';
    for (const line of detail.lines) {
      const row = document.createElement('div');
      row.textContent = line;
      this.detailLines.appendChild(row);
    }
    if (detail.fusion) {
      this.detailFusionIcon.src = detail.fusion.iconUrl;
      this.detailFusionLabel.textContent = detail.fusion.label;
      this.detailFusionRow.style.display = 'flex';
    } else {
      this.detailFusionRow.style.display = 'none';
    }
    this.detailOverlay.style.display = 'flex';
  }

  private hideDetail(): void {
    this.detailOverlay.style.display = 'none';
  }

  /**
   * Long-press (per user request: full detail on hold, without disturbing the existing tap behavior — open
   * tray / queue unit). Cancels on significant movement so it doesn't fire mid-drag or mid-scroll. Returns a
   * `wasLongPress()` check the caller's own 'click' handler must call first and bail out on — same-element
   * listeners fire in registration order regardless of a capture flag, so suppressing the click by racing
   * event phases isn't reliable; an explicit shared flag is.
   */
  private attachLongPress(el: HTMLElement, onLongPress: () => void): { wasLongPress: () => boolean } {
    const HOLD_MS = 480;
    const MOVE_CANCEL_PX = 12;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0;
    let startY = 0;
    let fired = false;

    const clear = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };

    el.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
      clear();
      timer = setTimeout(() => {
        fired = true;
        onLongPress();
      }, HOLD_MS);
    });
    el.addEventListener('pointermove', (e) => {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_CANCEL_PX) clear();
    });
    el.addEventListener('pointerup', clear);
    el.addEventListener('pointerleave', clear);
    el.addEventListener('pointercancel', clear);

    return {
      wasLongPress: () => {
        if (!fired) return false;
        fired = false;
        return true;
      },
    };
  }

  private buildTile(role: BuildingRole): { tileEl: HTMLButtonElement; tileParts: TileElements } {
    const tile = document.createElement('button');
    tile.style.cssText = `
      position: relative; width: ${TILE_SIZE}px; height: ${TILE_SIZE}px;
      background: rgba(10,16,24,0.85); border: 2px solid #2ea3ff55; border-radius: 10px;
      cursor: pointer; touch-action: manipulation; padding: 0;
    `;

    const progressRing = document.createElement('div');
    progressRing.style.cssText = `
      position: absolute; inset: -2px; border-radius: 10px; pointer-events: none;
      border: 2px solid transparent;
    `;
    tile.appendChild(progressRing);

    const icon = document.createElement('img');
    icon.style.cssText = `
      position: absolute; top: 2px; left: 50%; transform: translateX(-50%);
      width: 30px; height: 30px; object-fit: contain; pointer-events: none;
    `;
    tile.appendChild(icon);

    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute; left: 0; right: 0; bottom: 2px;
      font-size: 9px; font-weight: 600; color: #dff3ff; text-align: center; padding: 0 2px;
      line-height: 1.1; text-shadow: 0 1px 2px rgba(0,0,0,0.9);
    `;
    tile.appendChild(label);

    const queueBadge = document.createElement('div');
    queueBadge.style.cssText = `
      position: absolute; top: -6px; right: -6px; min-width: 16px; height: 16px; border-radius: 8px;
      background: #4fc3ff; color: #0b0d10; font-size: 10px; font-weight: 700;
      display: none; align-items: center; justify-content: center; padding: 0 3px;
    `;
    tile.appendChild(queueBadge);

    const tileParts: TileElements = { tile, progressRing, queueBadge, icon, label, detail: null };
    const longPress = this.attachLongPress(tile, () => {
      if (tileParts.detail) this.showDetail(tileParts.detail);
    });
    tile.addEventListener('click', () => {
      if (longPress.wasLongPress()) return;
      soundManager.playUIClick();
      this.openRole = this.openRole === role ? null : role;
      this.applyOpenState();
    });

    return { tileEl: tile, tileParts };
  }

  private buildTray(role: BuildingRole, callbacks: HUDCallbacks): TrayElements {
    const tray = document.createElement('div');
    tray.style.cssText = `
      background: rgba(10,16,24,0.9); border: 1px solid #2ea3ff55; border-radius: 8px;
      padding: 8px; display: flex; flex-direction: column; gap: 4px; width: 220px;
      max-height: 46vh; overflow-y: auto;
    `;

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display: flex; align-items: center; gap: 6px;';
    const titleIcon = document.createElement('img');
    titleIcon.style.cssText = 'width: 28px; height: 28px; object-fit: contain; flex: none;';
    const title = document.createElement('div');
    title.style.cssText = 'font-size: 11px; font-weight: 700; color: #9fd8ff;';
    titleRow.append(titleIcon, title);
    tray.appendChild(titleRow);

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

    return { tray, title, titleIcon, statsLine, buildRow, queueLabel, unitsRow, unitButtons: new Map(), rallySetBtn, rallyClearBtn, mergeBtn };
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
    this.coreEnergyEl.textContent = `Core Energy: ${Math.floor(state.coreEnergy)}`;
    this.factionResourceEl.textContent = `${state.factionResourceLabel}: ${Math.floor(state.factionResource)}`;
    this.supplyEl.textContent = `Supply: ${state.supplyUsed} (${state.unitCount} units)`;
    if (this.lastFactionResourceColor !== state.factionResourceColor) {
      this.lastFactionResourceColor = state.factionResourceColor;
      this.factionResourceIcon.innerHTML = factionResourceIconSvg(state.factionResourceColor);
    }

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
    if (tile.icon.src !== panelState.iconUrl) tile.icon.src = panelState.iconUrl;
    tile.detail = panelState.detail;

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
    if (tray.titleIcon.src !== panelState.iconUrl) tray.titleIcon.src = panelState.iconUrl;
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
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '5px';
        const icon = document.createElement('img');
        icon.style.cssText = 'width: 26px; height: 26px; object-fit: contain; flex: none;';
        const text = document.createElement('div');
        text.style.cssText = 'white-space: pre-line; flex: 1; min-width: 0;';
        btn.append(icon, text);
        const elements: UnitButtonElements = { btn, icon, text, detail: null };
        const longPress = this.attachLongPress(btn, () => {
          if (elements.detail) this.showDetail(elements.detail);
        });
        btn.addEventListener('click', () => {
          if (longPress.wasLongPress()) return;
          this.callbacks.onQueueUnit(panelState.role, unit.unitId);
        });
        tray.unitsRow.appendChild(btn);
        tray.unitButtons.set(unit.unitId, elements);
      }
    }
    for (const unit of panelState.units) {
      const elements = tray.unitButtons.get(unit.unitId);
      if (!elements) continue;
      elements.btn.style.display = built ? 'flex' : 'none';
      if (elements.icon.src !== unit.iconUrl) elements.icon.src = unit.iconUrl;
      elements.detail = unit.detail;
      elements.text.textContent = [unit.name, unit.statsLabel, unit.abilityLabel, unit.costLabel].filter(Boolean).join('\n');
      elements.btn.disabled = panelState.queueFull || !panelState.unitAffordability[unit.unitId];
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

    for (const btn of [tray.buildRow, ...[...tray.unitButtons.values()].map((u) => u.btn), tray.rallySetBtn, tray.rallyClearBtn, tray.mergeBtn]) {
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

  /** Shows/hides the single-selected-unit portrait (per user request: a live picture + stats, updated every frame so its health bar tracks damage). Pass null when 0 or 2+ units are selected. */
  setPortrait(portrait: HUDPortraitInfo | null): void {
    if (!portrait) {
      this.portraitEl.style.display = 'none';
      return;
    }
    this.portraitEl.style.display = 'block';
    if (this.portraitIcon.src !== portrait.iconUrl) this.portraitIcon.src = portrait.iconUrl;
    this.portraitTitle.textContent = portrait.title;
    this.portraitSubtitle.textContent = portrait.subtitle;

    const pct = portrait.maxHp > 0 ? Math.max(0, Math.min(1, portrait.hp / portrait.maxHp)) : 0;
    this.portraitHpBarFill.style.width = `${pct * 100}%`;
    this.portraitHpBarFill.style.background = pct > 0.5 ? 'linear-gradient(90deg, #4fc3ff, #9fe8ff)' : pct > 0.25 ? 'linear-gradient(90deg, #ffb84f, #ffd39f)' : 'linear-gradient(90deg, #ff4f4f, #ff9f9f)';
    this.portraitHpText.textContent = `❤ ${Math.ceil(portrait.hp)} / ${portrait.maxHp}`;

    this.portraitLines.innerHTML = '';
    for (const line of portrait.lines) {
      const row = document.createElement('div');
      row.textContent = line;
      this.portraitLines.appendChild(row);
    }

    if (portrait.fusion) {
      this.portraitFusionIcon.src = portrait.fusion.iconUrl;
      this.portraitFusionLabel.textContent = portrait.fusion.label;
      this.portraitFusionRow.style.display = 'flex';
    } else {
      this.portraitFusionRow.style.display = 'none';
    }
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
