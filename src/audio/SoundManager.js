/**
 * SoundManager: Procedural Web Audio API Sound & Music Synthesizer
 * Zero external audio assets required. 100% synthesized in real-time.
 */
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    
    this.muted = localStorage.getItem('cyberball_muted') === 'true';
    this.sfxVolume = parseFloat(localStorage.getItem('cyberball_sfx_vol') || '0.7');
    this.musicVolume = parseFloat(localStorage.getItem('cyberball_music_vol') || '0.4');
    
    // Music state
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bgmBpm = 118;
    this.targetBpm = 118;
    this.rallyIntensity = 0; // 0 to 1
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    localStorage.setItem('cyberball_muted', muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('cyberball_sfx_vol', this.sfxVolume);
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('cyberball_music_vol', this.musicVolume);
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
  }

  // --- Sound Effects ---

  /**
   * Paddle impact sound
   * @param {boolean} isPlayer - Near paddle vs Far paddle
   * @param {boolean} isPowerSmash - Triggered when smashed with high paddle velocity
   * @param {number} speedRatio - 0.5 to 2.0
   */
  playPaddleHit(isPlayer = true, isPowerSmash = false, speedRatio = 1.0) {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    const t = this.ctx.currentTime;

    // Sub thump
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const baseFreq = isPlayer ? 240 * speedRatio : 180 * speedRatio;
    
    osc1.type = isPowerSmash ? 'sawtooth' : 'triangle';
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc1.frequency.exponentialRampToValueAtTime(isPlayer ? 60 : 45, t + 0.12);

    const initialGain = isPowerSmash ? 0.9 : 0.6;
    gain1.gain.setValueAtTime(initialGain, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + (isPowerSmash ? 0.25 : 0.12));

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(t);
    osc1.stop(t + (isPowerSmash ? 0.25 : 0.12));

    // Metallic ping / ping-pong snap
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(isPowerSmash ? 1600 : 1100, t);
    osc2.frequency.exponentialRampToValueAtTime(isPowerSmash ? 400 : 250, t + 0.08);

    gain2.gain.setValueAtTime(0.4, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(t);
    osc2.stop(t + 0.08);

    if (isPowerSmash) {
      this.playPowerSmashLaser();
    }
  }

  playPowerSmashLaser() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.28);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  /**
   * Wall bounce with spatial 3D stereo panning and depth lowpass
   * @param {number} xNorm - -1 (left) to +1 (right)
   * @param {number} zNorm - 0 (near) to 1 (far)
   */
  playWallBounce(xNorm = 0, zNorm = 0.5) {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    const t = this.ctx.currentTime;

    // Stereo panner
    let panner;
    try {
      panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, xNorm)), t);
    } catch {
      panner = null;
    }

    // Depth lowpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoff = 6000 * (1 - zNorm * 0.75) + 600;
    filter.frequency.setValueAtTime(cutoff, t);

    // Resonant thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 + (1 - zNorm) * 80, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);

    const vol = (1 - zNorm * 0.5) * 0.5;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(filter);
    if (panner) {
      filter.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      filter.connect(this.sfxGain);
    }

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Doppler Whoosh when ball curves fast past camera
   */
  playCurveWhoosh(intensity = 1.0) {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    const t = this.ctx.currentTime;

    // Filtered noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(4, t);
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(1600, t + 0.12);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.25);

    const gain = this.ctx.createGain();
    const vol = Math.min(0.4, 0.2 * intensity);
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(t);
    whiteNoise.stop(t + 0.25);
  }

  /**
   * Point scored celebration / chord
   */
  playScore(isPlayerWon = true) {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    const t = this.ctx.currentTime;

    if (isPlayerWon) {
      // Ascending triumphant major triad (C5, E5, G5, C6)
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + idx * 0.07);

        gain.gain.setValueAtTime(0, t + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.25, t + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t + idx * 0.07);
        osc.stop(t + idx * 0.07 + 0.35);
      });
    } else {
      // Low descending buzz / fail
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.linearRampToValueAtTime(50, t + 0.4);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.4);
    }
  }

  /**
   * Level cleared / victory fanfare
   */
  playLevelComplete() {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + i * 0.09);

      gain.gain.setValueAtTime(0.2, t + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.4);
    });
  }

  /**
   * Game over sound
   */
  playGameOver() {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    const t = this.ctx.currentTime;
    const freqs = [330, 311.13, 293.66, 277.18];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t + i * 0.16);

      gain.gain.setValueAtTime(0.3, t + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.16 + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.16);
      osc.stop(t + i * 0.16 + 0.5);
    });
  }

  // --- Procedural Synthwave BGM Engine ---

  startBGM() {
    if (this.bgmPlaying) return;
    this.ensureContext();
    this.bgmPlaying = true;
    this.bgmStep = 0;
    this.scheduleBGMStep();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  updateBGMRally(rallyCount) {
    // Escalate tempo and energy as rally lengthens!
    const capped = Math.min(25, rallyCount);
    this.rallyIntensity = capped / 25;
    this.targetBpm = 118 + this.rallyIntensity * 32; // 118 -> 150 BPM
  }

  scheduleBGMStep() {
    if (!this.bgmPlaying || !this.ctx) return;

    // Smoothly interpolate BPM
    this.bgmBpm += (this.targetBpm - this.bgmBpm) * 0.15;
    const stepDuration = 60 / this.bgmBpm / 4; // 16th note in seconds

    const t = this.ctx.currentTime;

    // 16-step bassline progression in A Minor / D Minor
    // A2 (110Hz), C3 (130.8), E2 (82.4), G2 (98), F2 (87.3)
    const bassline = [
      110, 110, 220, 110,  130.8, 110, 164.8, 110,
      87.3, 87.3, 174.6, 87.3, 98, 98, 196, 130.8
    ];
    const bassFreq = bassline[this.bgmStep % 16];

    // Play Bass Note
    if (this.bgmStep % 2 === 0 || this.rallyIntensity > 0.4) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassFreq * 0.5, t);

      // Lowpass cutoff opens up with rally intensity
      const cutoff = 400 + this.rallyIntensity * 2200;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, t);
      filter.frequency.exponentialRampToValueAtTime(200, t + stepDuration * 0.9);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + stepDuration * 0.9);
    }

    // Hi-hat pulse on every 16th note offbeat
    if (this.bgmStep % 2 === 1 || this.rallyIntensity > 0.5) {
      const bufSize = Math.floor(this.ctx.sampleRate * 0.04);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;

      const hpf = this.ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.setValueAtTime(7000, t);

      const hGain = this.ctx.createGain();
      const hVol = 0.08 + this.rallyIntensity * 0.08;
      hGain.gain.setValueAtTime(hVol, t);
      hGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

      noise.connect(hpf);
      hpf.connect(hGain);
      hGain.connect(this.musicGain);

      noise.start(t);
      noise.stop(t + 0.04);
    }

    // Synth Arpeggio lead chord shimmer on quarter beats
    if (this.bgmStep % 4 === 0) {
      const arpHarmonies = [440, 523.25, 659.25, 783.99, 880];
      const leadFreq = arpHarmonies[(this.bgmStep / 4) % arpHarmonies.length];

      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      leadOsc.type = 'square';
      leadOsc.frequency.setValueAtTime(leadFreq, t);

      const lVol = 0.08 + this.rallyIntensity * 0.09;
      leadGain.gain.setValueAtTime(lVol, t);
      leadGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 1.8);

      leadOsc.connect(leadGain);
      leadGain.connect(this.musicGain);
      leadOsc.start(t);
      leadOsc.stop(t + stepDuration * 1.8);
    }

    this.bgmStep++;
    this.bgmTimer = setTimeout(() => {
      this.scheduleBGMStep();
    }, stepDuration * 1000);
  }
}
