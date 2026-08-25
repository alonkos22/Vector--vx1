export interface HUDCallbacks {
  onTrainHarvester: () => void;
  onBeginPlaceFluxSiphon: () => void;
}

export interface HUDState {
  coreEnergy: number;
  factionResource: number;
  factionResourceLabel: string;
  harvesterCount: number;
  supplyUsed: number;
  coreSpireProducing: boolean;
  coreSpireProgress: number | null;
  fluxSiphonBuilt: boolean;
  fluxSiphonProgress: number | null;
  canAffordHarvester: boolean;
  canAffordFluxSiphon: boolean;
  placementModeActive: boolean;
}

function styleButton(button: HTMLButtonElement): void {
  button.style.cssText = `
    font: inherit; font-size: 13px; color: #dff3ff; text-align: left;
    background: rgba(46,163,255,0.15); border: 1px solid #2ea3ff88;
    border-radius: 4px; padding: 8px 10px; cursor: pointer;
  `;
  button.addEventListener('mouseenter', () => {
    if (!button.disabled) button.style.background = 'rgba(46,163,255,0.32)';
  });
  button.addEventListener('mouseleave', () => {
    if (!button.disabled) button.style.background = 'rgba(46,163,255,0.15)';
  });
}

/** Minimal DOM-based HUD: resource counters + economy action buttons. */
export class HUD {
  private readonly coreEnergyEl: HTMLSpanElement;
  private readonly factionResourceEl: HTMLSpanElement;
  private readonly supplyEl: HTMLSpanElement;
  private readonly trainButton: HTMLButtonElement;
  private readonly siphonButton: HTMLButtonElement;
  private readonly statusEl: HTMLDivElement;
  private readonly selectionEl: HTMLDivElement;

  constructor(container: HTMLElement, callbacks: HUDCallbacks) {
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

    const actionBar = document.createElement('div');
    actionBar.style.cssText = `
      background: rgba(10,16,24,0.75); border: 1px solid #2ea3ff55;
      border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 6px;
      pointer-events: auto; min-width: 240px;
    `;

    this.trainButton = document.createElement('button');
    styleButton(this.trainButton);
    this.trainButton.addEventListener('click', callbacks.onTrainHarvester);
    actionBar.appendChild(this.trainButton);

    this.siphonButton = document.createElement('button');
    styleButton(this.siphonButton);
    this.siphonButton.addEventListener('click', callbacks.onBeginPlaceFluxSiphon);
    actionBar.appendChild(this.siphonButton);

    this.statusEl = document.createElement('div');
    this.statusEl.style.cssText = 'font-size: 12px; color: #9fd8ff; min-height: 16px;';
    actionBar.appendChild(this.statusEl);

    root.appendChild(actionBar);
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

  update(state: HUDState): void {
    this.coreEnergyEl.textContent = `⚡ Core Energy: ${Math.floor(state.coreEnergy)}`;
    this.factionResourceEl.textContent = `◆ ${state.factionResourceLabel}: ${Math.floor(state.factionResource)}`;
    this.supplyEl.textContent = `Supply: ${state.supplyUsed} (${state.harvesterCount} harvesters)`;

    if (state.coreSpireProducing && state.coreSpireProgress !== null) {
      this.trainButton.textContent = `Training Flux Harvester… ${Math.floor(state.coreSpireProgress * 100)}%`;
      this.trainButton.disabled = true;
    } else {
      this.trainButton.textContent = 'Train Flux Harvester (30⚡ · 9s)';
      this.trainButton.disabled = !state.canAffordHarvester;
    }

    if (state.fluxSiphonBuilt) {
      this.siphonButton.textContent = 'Flux Siphon built';
      this.siphonButton.disabled = true;
    } else if (state.fluxSiphonProgress !== null) {
      this.siphonButton.textContent = `Building Flux Siphon… ${Math.floor(state.fluxSiphonProgress * 100)}%`;
      this.siphonButton.disabled = true;
    } else if (state.placementModeActive) {
      this.siphonButton.textContent = 'Click the ground to place (Esc to cancel)';
      this.siphonButton.disabled = false;
    } else {
      this.siphonButton.textContent = 'Build Flux Siphon (50⚡ · 25s)';
      this.siphonButton.disabled = !state.canAffordFluxSiphon;
    }

    for (const btn of [this.trainButton, this.siphonButton]) {
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
}
