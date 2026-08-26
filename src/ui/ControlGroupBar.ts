const LONG_PRESS_MS = 500;
const SLOT_SIZE = 30;

/**
 * Touch-friendly control-group bar (1-9): tap a slot to recall that group,
 * long-press to assign the current selection to it. Keyboard already has
 * Ctrl+1-9 (set) / 1-9 (recall) via SelectionManager's own listener — this
 * is the touch equivalent, since touch has no Ctrl key. Filled slots (with
 * still-live units) are highlighted so the player can tell at a glance
 * which groups are populated.
 */
export class ControlGroupBar {
  private readonly slots: HTMLButtonElement[] = [];

  constructor(container: HTMLElement, onRecall: (groupNumber: number) => void, onAssign: (groupNumber: number) => void) {
    const root = document.createElement('div');
    root.style.cssText = `
      position: absolute; top: 60px; right: 12px;
      display: flex; gap: 4px; pointer-events: auto;
    `;
    container.appendChild(root);

    for (let n = 1; n <= 9; n++) {
      const slot = document.createElement('button');
      slot.textContent = String(n);
      slot.style.cssText = `
        width: ${SLOT_SIZE}px; height: ${SLOT_SIZE}px; padding: 0;
        font: inherit; font-size: 12px; font-weight: 700; color: #4a5a68;
        background: rgba(10,16,24,0.75); border: 1px solid #2ea3ff55; border-radius: 4px;
        cursor: pointer; touch-action: manipulation;
      `;

      // Measured at release against the actual elapsed wall-clock time, rather than relying on a
      // setTimeout callback landing precisely mid-hold: under heavy per-frame JS work (e.g. a busy
      // render loop) a timer callback can be starved past the hold's actual release, which would
      // silently swallow a genuine long-press. Comparing real elapsed time at pointerup is immune to that.
      let downAt: number | null = null;

      slot.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        downAt = performance.now();
      });
      slot.addEventListener('pointerup', () => {
        if (downAt === null) return;
        const held = performance.now() - downAt;
        downAt = null;
        if (held >= LONG_PRESS_MS) onAssign(n);
        else onRecall(n);
      });
      slot.addEventListener('pointerleave', () => { downAt = null; });
      slot.addEventListener('pointercancel', () => { downAt = null; });

      root.appendChild(slot);
      this.slots.push(slot);
    }
  }

  /** `filled[n-1]` true = group n has live units assigned, for the highlight. */
  update(filled: boolean[]): void {
    for (let i = 0; i < this.slots.length; i++) {
      const isFilled = filled[i] ?? false;
      this.slots[i].style.color = isFilled ? '#dff3ff' : '#4a5a68';
      this.slots[i].style.borderColor = isFilled ? '#4fc3ff' : '#2ea3ff55';
      this.slots[i].style.background = isFilled ? 'rgba(46,163,255,0.22)' : 'rgba(10,16,24,0.75)';
    }
  }
}
