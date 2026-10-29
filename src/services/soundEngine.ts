import { AdzanAlertMode } from '../types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isPlayingLofi = false;
  private lofiInterval: number | null = null;
  private adzanStopFn: (() => void) | null = null;
  private currentTrackName = 'Midnight Cyber Lo-Fi';
  private sfxEnabled = true;
  private sfxVolume = 0.7; // Default 70%

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  public setSfxVolume(volumePct: number): void {
    this.sfxVolume = Math.max(0.01, Math.min(1, volumePct / 100));
  }

  public getSfxVolume(): number {
    return Math.round(this.sfxVolume * 100);
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleLofiFocusPlayer(): boolean {
    if (this.isPlayingLofi) {
      this.stopLofiFocusPlayer();
      return false;
    } else {
      this.startLofiFocusPlayer();
      return true;
    }
  }

  public getLofiState(): { isPlaying: boolean; trackName: string } {
    return {
      isPlaying: this.isPlayingLofi,
      trackName: this.currentTrackName,
    };
  }

  public startLofiFocusPlayer(): void {
    if (this.isPlayingLofi) return;
    const ctx = this.ensureContext();
    this.isPlayingLofi = true;

    // Progresi chord Lo-Fi Rhodes hangat (Dm9 -> G13 -> Cmaj9 -> A7alt)
    const chords = [
      [293.66, 349.23, 440.0, 523.25, 659.25],
      [196.0, 349.23, 440.0, 493.88, 659.25],
      [261.63, 329.63, 392.0, 493.88, 587.33],
      [220.0, 329.63, 392.0, 466.16, 622.25],
    ];
    let step = 0;

    const playChord = () => {
      if (!this.isPlayingLofi) return;
      const now = ctx.currentTime;
      const notes = chords[step % chords.length];
      step++;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime((0.025 * this.sfxVolume) / notes.length, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 3.5);
      });
    };

    playChord();
    this.lofiInterval = window.setInterval(playChord, 3500);
  }

  public stopLofiFocusPlayer(): void {
    this.isPlayingLofi = false;
    if (this.lofiInterval !== null) {
      clearInterval(this.lofiInterval);
      this.lofiInterval = null;
    }
  }

  /**
   * Memainkan Peringatan Waktu Shalat sesuai mode (full-adzan | soft-chime | silent)
   */
  public playPrayerAlert(mode: AdzanAlertMode): void {
    this.stopPrayerAlert();
    if (mode === 'silent') return;

    const ctx = this.ensureContext();
    let cancelled = false;

    if (mode === 'soft-chime') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const now = ctx.currentTime + i * 0.25;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.08 * this.sfxVolume, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.5);
      });
      return;
    }

    // Mode 'full-adzan': Melodi Maqam Hijaz yang syahdu & tenang dengan opsi Mute Cepat 1-Klik
    const hijazSequence = [
      { freq: 293.66, dur: 1.4, delay: 0 }, // D4
      { freq: 311.13, dur: 0.8, delay: 1.5 }, // Eb4
      { freq: 369.99, dur: 1.8, delay: 2.4 }, // F#4
      { freq: 392.0, dur: 2.2, delay: 4.3 }, // G4
      { freq: 369.99, dur: 1.2, delay: 6.6 }, // F#4
      { freq: 311.13, dur: 1.2, delay: 7.9 }, // Eb4
      { freq: 293.66, dur: 2.8, delay: 9.2 }, // D4
    ];

    const oscillators: OscillatorNode[] = [];
    hijazSequence.forEach((item) => {
      const start = ctx.currentTime + item.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.07 * this.sfxVolume, start + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + item.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + item.dur + 0.05);
      oscillators.push(osc);
    });

    this.adzanStopFn = () => {
      if (cancelled) return;
      cancelled = true;
      oscillators.forEach((o) => {
        try {
          o.stop();
        } catch {
          // ignore
        }
      });
    };
  }

  public stopPrayerAlert(): void {
    if (this.adzanStopFn) {
      this.adzanStopFn();
      this.adzanStopFn = null;
    }
  }

  /**
   * Notifikasi berkas masuk via Bridge: Crystal Waterdrop / Bubble Pop (Opsi A)
   * Suara tetesan air kristal taktil dengan pitch sweep cepat yang renyah & memuaskan
   */
  public playFileReceivedPop(): void {
    if (!this.sfxEnabled) return;
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;

      // Nada utama: pitch sweep cepat ala tetesan air kristal (bubble drop)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(1480, now + 0.045);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.14 * this.sfxVolume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);

      // Harmonik kristal lembut di latar belakang untuk kilau akustik (crystal ping)
      const shimmerOsc = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmerOsc.type = 'sine';
      shimmerOsc.frequency.setValueAtTime(1760, now + 0.02); // A6

      shimmerGain.gain.setValueAtTime(0.001, now + 0.02);
      shimmerGain.gain.exponentialRampToValueAtTime(0.045 * this.sfxVolume, now + 0.035);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);
      shimmerOsc.start(now + 0.02);
      shimmerOsc.stop(now + 0.24);
    } catch {
      // ignore
    }
  }

  /**
   * Notifikasi tugas / rutinitas mendekati tenggat waktu: Double Soft Ping (Opsi A)
   * Dua nada marimba lembut bernada tinggi (D5 -> A5, "ting-ting" 0.3 dtk) yang sopan & ramah
   */
  public playTaskReminderPing(): void {
    if (!this.sfxEnabled) return;
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      // D5 (587.33 Hz) -> A5 (880.00 Hz) akor marimba dua nada lembut
      const notes = [
        { freq: 587.33, delay: 0 },
        { freq: 880.0, delay: 0.13 },
      ];

      notes.forEach((item) => {
        const start = now + item.delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(item.freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.065 * this.sfxVolume, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch {
      // ignore if autoplay blocked
    }
  }

  /**
   * Alias untuk pengingat rutinitas
   */
  public playHabitReminderPing(): void {
    this.playTaskReminderPing();
  }

  public playMagneticImpact(): void {
    if (!this.sfxEnabled) return;
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.08);
      gain.gain.setValueAtTime(0.22 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  public playHappyPatChime(): void {
    if (!this.sfxEnabled) return;
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      const notes = [659.25, 880.0]; // E5 -> A5 hangat & imut
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.045 * this.sfxVolume, now + idx * 0.09 + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    } catch {}
  }

  public playFocusTimerCompleteChime(): void {
    if (!this.sfxEnabled) return;
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 -> E5 -> G5 -> C6 lembut
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);
        gain.gain.setValueAtTime(0.001, now + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.06 * this.sfxVolume, now + idx * 0.16 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 0.85);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.9);
      });
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
