// Web Audio API based sound effects - no external files needed
class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled) return;
    this.init();
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  playComplete() {
    if (!this.enabled) return;
    // Happy chime: C5 -> E5 -> G5 -> C6
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.25), i * 150);
    });
  }

  playBreakEnd() {
    if (!this.enabled) return;
    // Gentle reminder: two lower tones
    this.playTone(440, 0.2, 'sine', 0.2);
    setTimeout(() => this.playTone(523, 0.3, 'sine', 0.2), 250);
  }

  playClick() {
    if (!this.enabled) return;
    this.playTone(800, 0.05, 'sine', 0.1);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

window.soundManager = new SoundManager();
