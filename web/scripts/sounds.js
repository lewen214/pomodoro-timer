const SOUND_DB = 'pomodoro-sounds';
const SOUND_STORE = 'files';

class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this.settings = {};
    this.ambienceNodes = [];
    this.customUrls = new Map();
  }

  configure(settings) {
    this.settings = settings;
    this.enabled = settings.soundEnabled;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stopAmbience();
  }

  async startAmbience() {
    this.stopAmbience();
    if (!this.enabled || this.settings.ambienceSound === 'off') return;
    this.init();

    if (this.settings.ambienceSound === 'custom') {
      await this.playCustomLoop('ambience');
      return;
    }

    const gain = this.audioCtx.createGain();
    gain.gain.value = (this.settings.ambienceVolume || 35) / 100 * 0.22;
    gain.connect(this.audioCtx.destination);
    this.ambienceNodes.push(gain);

    if (this.settings.ambienceSound === 'white') {
      this.createNoiseSource(gain, 1);
    } else if (this.settings.ambienceSound === 'rain') {
      this.createNoiseSource(gain, 0.8, 1200);
      this.createPulseLayer(gain, 12, 0.04);
    } else if (this.settings.ambienceSound === 'forest') {
      this.createNoiseSource(gain, 0.35, 2600);
      this.createPulseLayer(gain, 3, 0.03);
      this.createToneLayer(gain, [880, 1175, 1320], 0.018);
    } else if (this.settings.ambienceSound === 'ocean') {
      this.createNoiseSource(gain, 0.55, 650);
      this.createSwellLayer(gain);
    } else if (this.settings.ambienceSound === 'fire') {
      this.createNoiseSource(gain, 0.5, 900);
      this.createPulseLayer(gain, 18, 0.05);
    }
  }

  stopAmbience() {
    this.ambienceNodes.forEach((node) => {
      if (node.stop) node.stop();
      if (node.disconnect) node.disconnect();
    });
    this.ambienceNodes = [];
  }

  createNoiseSource(destination, volume = 1, frequency = 1800) {
    const sampleRate = this.audioCtx.sampleRate;
    const buffer = this.audioCtx.createBuffer(1, sampleRate * 2, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }

    const source = this.audioCtx.createBufferSource();
    const filter = this.audioCtx.createBiquadFilter();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    source.connect(filter);
    filter.connect(destination);
    source.start();
    this.ambienceNodes.push(source, filter);
  }

  createPulseLayer(destination, rate, volume) {
    const interval = window.setInterval(() => {
      if (!this.audioCtx) return;
      this.playTone(220 + Math.random() * 1200, 0.035, 'triangle', volume, destination);
    }, 1000 / rate);
    this.ambienceNodes.push({ stop: () => clearInterval(interval) });
  }

  createToneLayer(destination, frequencies, volume) {
    frequencies.forEach((frequency, index) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(destination);
      osc.start(this.audioCtx.currentTime + index * 0.2);
      this.ambienceNodes.push(osc, gain);
    });
  }

  createSwellLayer(destination) {
    const lfo = this.audioCtx.createOscillator();
    const lfoGain = this.audioCtx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = destination.gain.value * 0.4;
    lfo.connect(lfoGain);
    lfoGain.connect(destination.gain);
    lfo.start();
    this.ambienceNodes.push(lfo, lfoGain);
  }

  playTone(frequency, duration, type = 'sine', volume = 0.3, destination = null) {
    if (!this.enabled) return;
    this.init();
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(destination || this.audioCtx.destination);
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  async playComplete() {
    await this.playAlert(this.settings.focusAlertSound || 'chime', 'focusAlert');
  }

  async playBreakEnd() {
    await this.playAlert(this.settings.breakAlertSound || 'soft', 'breakAlert');
  }

  async playAlert(sound, customKey) {
    if (!this.enabled || sound === 'off') return;
    if (sound === 'custom') {
      await this.playCustomOnce(customKey);
      return;
    }

    const patterns = {
      chime: [[523, 0.25], [659, 0.25], [784, 0.3], [1047, 0.45]],
      bell: [[784, 0.18], [1047, 0.5]],
      soft: [[440, 0.22], [523, 0.32]],
      digital: [[880, 0.08], [660, 0.08], [990, 0.16]],
    };
    (patterns[sound] || patterns.chime).forEach(([freq, duration], index) => {
      setTimeout(() => this.playTone(freq, duration, 'sine', 0.22), index * 160);
    });
  }

  playClick() {
    if (!this.enabled) return;
    this.playTone(800, 0.05, 'sine', 0.1);
  }

  async playCustomLoop(key) {
    const url = await this.getCustomUrl(key);
    if (!url) return;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = (this.settings.ambienceVolume || 35) / 100;
    await audio.play();
    this.ambienceNodes.push({
      stop: () => {
        audio.pause();
        audio.currentTime = 0;
      },
    });
  }

  async playCustomOnce(key) {
    const url = await this.getCustomUrl(key);
    if (!url) return;
    const audio = new Audio(url);
    audio.volume = 0.75;
    await audio.play();
  }

  async saveCustomFile(key, file) {
    const db = await this.openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SOUND_STORE, 'readwrite');
      tx.objectStore(SOUND_STORE).put({ key, file });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    this.revokeCustomUrl(key);
  }

  async getCustomUrl(key) {
    if (this.customUrls.has(key)) return this.customUrls.get(key);
    const record = await this.getCustomFile(key);
    if (!record?.file) return '';
    const url = URL.createObjectURL(record.file);
    this.customUrls.set(key, url);
    return url;
  }

  async getCustomFile(key) {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SOUND_STORE, 'readonly');
      const request = tx.objectStore(SOUND_STORE).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  revokeCustomUrl(key) {
    const url = this.customUrls.get(key);
    if (url) URL.revokeObjectURL(url);
    this.customUrls.delete(key);
  }

  openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(SOUND_DB, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(SOUND_STORE, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

window.soundManager = new SoundManager();
