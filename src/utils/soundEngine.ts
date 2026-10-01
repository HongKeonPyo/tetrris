// Synthesized Web Audio API Sound & Music Engine for Tetra Studio

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled: boolean = true;
  private bgmEnabled: boolean = false;
  private bgmIntervalId: number | null = null;
  private bgmStep: number = 0;

  // Classic Korobeiniki-inspired motif in A minor (frequencies in Hz)
  private readonly melodyNotes: { freq: number; dur: number }[] = [
    { freq: 659.25, dur: 2 }, // E5
    { freq: 493.88, dur: 1 }, // B4
    { freq: 523.25, dur: 1 }, // C5
    { freq: 587.33, dur: 2 }, // D5
    { freq: 523.25, dur: 1 }, // C5
    { freq: 493.88, dur: 1 }, // B4
    { freq: 440.00, dur: 2 }, // A4
    { freq: 440.00, dur: 1 }, // A4
    { freq: 523.25, dur: 1 }, // C5
    { freq: 659.25, dur: 2 }, // E5
    { freq: 587.33, dur: 1 }, // D5
    { freq: 523.25, dur: 1 }, // C5
    { freq: 493.88, dur: 3 }, // B4
    { freq: 523.25, dur: 1 }, // C5
    { freq: 587.33, dur: 2 }, // D5
    { freq: 659.25, dur: 2 }, // E5
    { freq: 523.25, dur: 2 }, // C5
    { freq: 440.00, dur: 2 }, // A4
    { freq: 440.00, dur: 4 }, // A4
    { freq: 587.33, dur: 2 }, // D5
    { freq: 698.46, dur: 1 }, // F5
    { freq: 880.00, dur: 2 }, // A5
    { freq: 783.99, dur: 1 }, // G5
    { freq: 698.46, dur: 1 }, // F5
    { freq: 659.25, dur: 3 }, // E5
    { freq: 523.25, dur: 1 }, // C5
    { freq: 659.25, dur: 2 }, // E5
    { freq: 587.33, dur: 1 }, // D5
    { freq: 523.25, dur: 1 }, // C5
    { freq: 493.88, dur: 2 }, // B4
    { freq: 493.88, dur: 1 }, // B4
    { freq: 523.25, dur: 1 }, // C5
    { freq: 587.33, dur: 2 }, // D5
    { freq: 659.25, dur: 2 }, // E5
    { freq: 523.25, dur: 2 }, // C5
    { freq: 440.00, dur: 2 }, // A4
    { freq: 440.00, dur: 4 }, // A4
  ];

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setBgmEnabled(enabled: boolean, isPlayingGame: boolean = false) {
    this.bgmEnabled = enabled;
    if (enabled && isPlayingGame) {
      this.startBgm();
    } else {
      this.stopBgm();
    }
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public startBgm() {
    this.stopBgm();
    if (!this.bgmEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.bgmStep = 0;
    let tickWait = 0;

    this.bgmIntervalId = window.setInterval(() => {
      if (!this.bgmEnabled) return;
      if (tickWait > 0) {
        tickWait--;
        return;
      }
      const note = this.melodyNotes[this.bgmStep % this.melodyNotes.length];
      this.playTone(note.freq * 0.5, note.dur * 0.14, 'triangle', 0.035);
      tickWait = note.dur - 1;
      this.bgmStep++;
    }, 155);
  }

  public stopBgm() {
    if (this.bgmIntervalId !== null) {
      window.clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    volume: number = 0.08,
    endFreq?: number,
    delaySec: number = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + durationSec);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.01);
  }

  public playMove() {
    if (!this.sfxEnabled) return;
    this.playTone(210, 0.035, 'triangle', 0.05, 160);
  }

  public playSoftDrop() {
    if (!this.sfxEnabled) return;
    this.playTone(170, 0.025, 'sine', 0.035, 130);
  }

  public playRotate(isTSpinSetup: boolean = false) {
    if (!this.sfxEnabled) return;
    if (isTSpinSetup) {
      // Crisp metallic harmonic click for T-Spin slot entry
      this.playTone(520, 0.06, 'triangle', 0.08, 780);
      this.playTone(780, 0.08, 'sine', 0.06, 1040, 0.03);
    } else {
      this.playTone(340, 0.05, 'triangle', 0.055, 460);
    }
  }

  public playHold() {
    if (!this.sfxEnabled) return;
    this.playTone(330, 0.055, 'sine', 0.06, 440);
    this.playTone(495, 0.07, 'triangle', 0.05, 440, 0.04);
  }

  public playLock() {
    if (!this.sfxEnabled) return;
    this.playTone(145, 0.06, 'triangle', 0.065, 90);
  }

  public playHardDrop() {
    if (!this.sfxEnabled) return;
    this.playTone(165, 0.09, 'triangle', 0.1, 58);
    this.playTone(310, 0.04, 'sine', 0.05, 120);
  }

  public playLineClear(
    lines: number,
    combo: number,
    isTSpin: boolean,
    isBackToBack: boolean,
    isAllClear: boolean
  ) {
    if (!this.sfxEnabled) return;
    const comboMultiplier = Math.pow(1.059463, Math.min(Math.max(0, combo), 12)); // Semitone step per combo
    const baseNotes =
      lines === 4 || isTSpin || isAllClear
        ? [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
        : lines === 3
        ? [440, 554.37, 659.25]
        : lines === 2
        ? [392, 493.88, 587.33]
        : [349.23, 440];

    baseNotes.forEach((freq, idx) => {
      const shifted = freq * comboMultiplier * (isBackToBack ? 1.12 : 1);
      this.playTone(
        shifted,
        0.14 + idx * 0.03,
        lines === 4 || isTSpin ? 'triangle' : 'sine',
        0.085,
        shifted * 1.02,
        idx * 0.045
      );
    });

    if (isAllClear) {
      [1046.5, 1318.5, 1567.98, 2093.0].forEach((freq, idx) => {
        this.playTone(freq, 0.22, 'triangle', 0.08, freq, 0.18 + idx * 0.055);
      });
    }
  }

  public playLevelUp() {
    if (!this.sfxEnabled) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.12, 'triangle', 0.075, freq, idx * 0.055);
    });
  }

  public playVictory() {
    if (!this.sfxEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.2, 'triangle', 0.09, freq, idx * 0.075);
    });
  }

  public playGameOver() {
    if (!this.sfxEnabled) return;
    const notes = [392.0, 369.99, 349.23, 329.63];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.22, 'sawtooth', 0.045, freq * 0.96, idx * 0.11);
    });
  }
}

export const soundEngine = new SoundEngine();
