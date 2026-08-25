export interface HUDUnitDef {
  unitId: string;
  name: string;
  costLabel: string;
}

export interface HUDPanelDef {
  buildingId: string;
  buildingName: string;
  /** Prebuilt buildings (Core Spire) never show a "Build" button — they exist from the start. */
  prebuilt: boolean;
  buildCostLabel: string;
  units: HUDUnitDef[];
}

export interface HUDCallbacks {
  onBeginPlaceBuilding: (buildingId: string) => void;
  onQueueUnit: (buildingId: string, unitId: string) => void;
}

export interface HUDPanelState {
  buildingId: string;
  built: boolean;
  placementActive: boolean;
  /** Construction progress 0..1, or null when not currently under construction. */
  constructionProgress: number | null;
  canAffordBuilding: boolean;
  queueLength: number;
  /** Progress 0..1 of the item at the head of the queue, or null when idle. */
  queueProgress: number | null;
  queueFull: boolean;
  unitAffordability: Record<string, boolean>;
}

export interface HUDState {
  coreEnergy: number;
  factionResource: number;
  factionResourceLabel: string;
  unitCount: number;
  supplyUsed: number;
  panels: HUDPanelState[];
}

function styleButton(button: HTMLButtonElement): void {
  button.style.cssText = `
    font: inherit; font-size: 13px; color: #dff3ff; text-align: left;
    background: rgba(46,163,255,0.15); border: 1px solid #2ea3ff88;
    border-radius: 4px; padding: 11px 12px; cursor: pointer;
    min-height: 40px; touch-action: manipulation;
  `;
  button.addEventListener('mouseenter', () => {
    if (!button.disabled) button.style.background = 'rgba(46,163,255,0.32)';
  });
  button.addEventListener('mouseleave', () => {
    if (!button.disabled) button.style.background = 'rgba(46,163,255,0.15)';
  });
}

interface PanelElements {
  container: HTMLDivElement;
  buildButton: HTMLButtonElement | null;
  queueLabel: HTMLDivElement;
  unitButtons: Map<string, HTMLButtonElement>;
}

/** DOM-based HUD: resource counters + one panel per production building, built once and updated per-frame. */
export class HUD {
  private readonly coreEnergyEl: HTMLSpanElement;
  private readonly factionResourceEl: HTMLSpanElement;
  private readonly supplyEl: HTMLSpanElement;
  private readonly statusEl: HTMLDivElement;
  private readonly selectionEl: HTMLDivElement;
  private readonly convergeButton: HTMLButtonElement;
  private readonly panels = new Map<string, PanelElements>();

  constructor(container: HTMLElement, panelDefs: HUDPanelDef[], callbacks: HUDCallbacks) {
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

    const panelsBar = document.createElement('div');
    panelsBar.style.cssText = 'display: flex; flex-direction: column; gap: 8px; align-items: flex-end;';

    for (const def of panelDefs) {
      panelsBar.appendChild(this.buildPanel(def, callbacks));
    }

    this.statusEl = document.createElement('div');
    this.statusEl.style.cssText =
      'font-size: 12px; color: #9fd8ff; background: rgba(10,16,24,0.75); border-radius: 4px; padding: 4px 8px; min-height: 14px;';
    panelsBar.appendChild(this.statusEl);

    root.appendChild(panelsBar);
    container.appendChild(root);

    this.selectionEl = document.createElement('div');
    this.selectionEl.style.cssText = `
      position: absolute; bottom: 12px; left: 12px;
      background: rgba(10,16,24,0.75); border: 1px solid #2ea3ff55;
      border-radius: 6px; padding: 8px 14px; font-size: 13px; color: #dff3ff;
      font-family: 'Segoe UI', Roboto, sans-serif; text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      pointer-events: none; display: none; user-select: none;
    `;
    container.appendChild(this.selectionEl);

    this.convergeButton = document.createElement('button');
    this.convergeButton.style.cssText = `
      position: absolute; bottom: 52px; left: 12px;
      font-size: 13px; color: #0b0d10; font-weight: 700; text-align: left;
      background: linear-gradient(135deg, #9fe8ff, #4fc3ff); border: 1px solid #dff3ff;
      border-radius: 6px; padding: 12px 14px; cursor: pointer; display: none;
      box-shadow: 0 0 14px #4fc3ffaa; touch-action: manipulation; min-height: 40px;
    `;
    container.appendChild(this.convergeButton);

    const hintEl = document.createElement('div');
    hintEl.style.cssText = `
      position: absolute; bottom: 12px; right: 12px;
      background: rgba(10,16,24,0.6); border: 1px solid #2ea3ff33;
      border-radius: 6px; padding: 6px 12px; font-size: 11px; color: #9fd8ffcc;
      font-family: 'Segoe UI', Roboto, sans-serif; pointer-events: none; user-select: none;
    `;
    hintEl.textContent = 'Drag: select · Right-click: move/attack · Dbl-click: select type · Ctrl+1-9: set group · 1-9: recall group';
    container.appendChild(hintEl);
  }

  private buildPanel(def: HUDPanelDef, callbacks: HUDCallbacks): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: rgba(10,16,24,0.75); border: 1px solid #2ea3ff55;
      border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 5px;
      pointer-events: auto; min-width: 240px;
    `;

    const title = document.createElement('div');
    title.style.cssText = 'font-size: 12px; font-weight: 600; color: #9fd8ff;';
    title.textContent = def.buildingName;
    panel.appendChild(title);

    let buildButton: HTMLButtonElement | null = null;
    if (!def.prebuilt) {
      buildButton = document.createElement('button');
      styleButton(buildButton);
      buildButton.textContent = `Build ${def.buildingName} (${def.buildCostLabel})`;
      buildButton.addEventListener('click', () => callbacks.onBeginPlaceBuilding(def.buildingId));
      panel.appendChild(buildButton);
    }

    const unitButtons = new Map<string, HTMLButtonElement>();
    for (const unit of def.units) {
      const btn = document.createElement('button');
      styleButton(btn);
      btn.textContent = `Train ${unit.name} (${unit.costLabel})`;
      btn.style.display = 'none';
      btn.addEventListener('click', () => callbacks.onQueueUnit(def.buildingId, unit.unitId));
      panel.appendChild(btn);
      unitButtons.set(unit.unitId, btn);
    }

    const queueLabel = document.createElement('div');
    queueLabel.style.cssText = 'font-size: 11px; color: #9fd8ffcc;';
    panel.appendChild(queueLabel);

    this.panels.set(def.buildingId, { container: panel, buildButton, queueLabel, unitButtons });
    return panel;
  }

  update(state: HUDState): void {
    this.coreEnergyEl.textContent = `⚡ Core Energy: ${Math.floor(state.coreEnergy)}`;
    this.factionResourceEl.textContent = `◆ ${state.factionResourceLabel}: ${Math.floor(state.factionResource)}`;
    this.supplyEl.textContent = `Supply: ${state.supplyUsed} (${state.unitCount} units)`;

    for (const panelState of state.panels) {
      const els = this.panels.get(panelState.buildingId);
      if (!els) continue;

      if (els.buildButton) {
        if (panelState.built) {
          els.buildButton.style.display = 'none';
        } else {
          els.buildButton.style.display = 'block';
          if (panelState.constructionProgress !== null) {
            els.buildButton.textContent = `Building… ${Math.floor(panelState.constructionProgress * 100)}%`;
            els.buildButton.disabled = true;
          } else if (panelState.placementActive) {
            els.buildButton.textContent = 'Click the ground to place (Esc to cancel)';
            els.buildButton.disabled = false;
          } else {
            els.buildButton.disabled = !panelState.canAffordBuilding;
          }
        }
      }

      for (const [unitId, btn] of els.unitButtons) {
        btn.style.display = panelState.built ? 'block' : 'none';
        if (!panelState.built) continue;
        btn.disabled = panelState.queueFull || !panelState.unitAffordability[unitId];
      }

      els.queueLabel.textContent =
        panelState.built && panelState.queueLength > 0
          ? `Queue: ${panelState.queueLength}${panelState.queueFull ? ' (full)' : ''} — building ${Math.floor((panelState.queueProgress ?? 0) * 100)}%`
          : '';

      for (const btn of [...(els.buildButton ? [els.buildButton] : []), ...els.unitButtons.values()]) {
        btn.style.opacity = btn.disabled ? '0.5' : '1';
        btn.style.cursor = btn.disabled ? 'default' : 'pointer';
      }
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
