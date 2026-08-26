import type { AttackVfxStyle } from '../config/factions';

/**
 * Lightweight sound effects synthesized entirely with the Web Audio API —
 * no audio asset files. Module-level singleton (same pattern as `pathGrid`
 * in Pathfinding.ts), so any file can `import { soundManager }` and call a
 * play method directly without threading an instance through constructors.
 * `unlock()` must run from a user-gesture handler — browsers block audio
 * until then — every play method is a safe no-op before that.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  unlock(): void {
    if (this.ctx) return;
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextCtor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    this.masterGain.connect(this.ctx.destination);
  }

  private envelope(gain: GainNode, attack: number, decay: number, peak: number): void {
    const t = this.ctx!.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private tone(freq: number, type: OscillatorType, duration: number, peak = 0.2, slideTo?: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    const t = this.ctx.currentTime;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    this.envelope(gain, 0.005, duration, peak);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  private noiseBurst(duration: number, peak = 0.2): void {
    if (!this.ctx || !this.masterGain) return;
    const size = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    noise.connect(gain);
    gain.connect(this.masterGain);
    this.envelope(gain, 0.002, duration, peak);
    noise.start(this.ctx.currentTime);
  }

  /** `powerScale` (from computePowerScale) makes a heavy hit's sound bigger/louder too, matching the visual feedback scaling. */
  playHit(style: AttackVfxStyle, powerScale = 1): void {
    const p = Math.min(powerScale, 1.8);
    const peak = 0.18 * p;
    const duration = 0.07 * p;
    switch (style) {
      case 'laser':
        this.tone(1400, 'sawtooth', duration, peak, 700);
        break;
      case 'lava-arc':
        this.noiseBurst(duration * 1.6, peak);
        this.tone(160, 'sine', duration, peak * 0.6);
        break;
      case 'light-beam':
        this.tone(1600, 'sine', duration, peak, 2200);
        break;
      case 'projectile':
        this.noiseBurst(duration, peak);
        break;
      case 'spore-burst':
        this.tone(480, 'triangle', duration, peak, 280);
        break;
      case 'shadow-bolt':
        this.tone(220, 'sawtooth', duration * 1.5, peak, 90);
        break;
    }
  }

  playDeath(): void {
    this.tone(320, 'sawtooth', 0.22, 0.16, 60);
  }

  playSpawn(): void {
    this.tone(520, 'sine', 0.1, 0.12, 900);
  }

  playBuildingComplete(): void {
    this.tone(440, 'triangle', 0.14, 0.16, 660);
  }

  playBuildingDestroyed(): void {
    this.noiseBurst(0.35, 0.28);
    this.tone(90, 'sawtooth', 0.4, 0.2, 40);
  }

  playFusion(): void {
    this.noiseBurst(0.3, 0.25);
    this.tone(200, 'sawtooth', 0.4, 0.22, 900);
  }

  playUIClick(): void {
    this.tone(700, 'square', 0.035, 0.08);
  }

  playVictory(): void {
    if (!this.ctx) return;
    [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.tone(f, 'triangle', 0.3, 0.2), i * 120));
  }

  playDefeat(): void {
    if (!this.ctx) return;
    [300, 260, 220, 160].forEach((f, i) => setTimeout(() => this.tone(f, 'sawtooth', 0.35, 0.18), i * 150));
  }
}

export const soundManager = new SoundManager();
