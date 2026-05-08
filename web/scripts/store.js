// Store bridge - wraps electron IPC for settings and stats
const DEFAULT_SETTINGS = {
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  pomodorosUntilLong: 4,
  theme: 'tomato',
  soundEnabled: true,
  ambienceSound: 'off',
  ambienceVolume: 35,
  focusAlertSound: 'chime',
  breakAlertSound: 'soft',
  customAmbienceName: '',
  customFocusAlertName: '',
  customBreakAlertName: '',
};

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyStats(dateKey = getLocalDateKey()) {
  return {
    todayDate: dateKey,
    todayPomodoros: 0,
    todayMinutes: 0,
    totalPomodoros: 0,
    totalMinutes: 0,
    history: {},
  };
}

function normalizeSettings(settings = {}) {
  return { ...DEFAULT_SETTINGS, ...settings };
}

function normalizeStats(stats = createEmptyStats()) {
  const today = getLocalDateKey();
  const normalized = { ...createEmptyStats(today), ...stats };
  normalized.history = normalized.history || {};
  const parsedLegacyDate = new Date(normalized.todayDate);
  const storedDateKey = Number.isNaN(parsedLegacyDate.getTime())
    ? normalized.todayDate
    : getLocalDateKey(parsedLegacyDate);

  if (storedDateKey && !normalized.history[storedDateKey]) {
    normalized.history[storedDateKey] = {
      pomodoros: normalized.todayPomodoros || 0,
      minutes: normalized.todayMinutes || 0,
    };
  }

  if (!normalized.history[today]) {
    normalized.history[today] = { pomodoros: 0, minutes: 0 };
  }

  if (normalized.todayDate !== today) {
    normalized.todayDate = today;
    normalized.todayPomodoros = normalized.history[today].pomodoros;
    normalized.todayMinutes = normalized.history[today].minutes;
  }

  return normalized;
}

class Store {
  constructor() {
    this._settings = null;
    this._stats = null;
  }

  async loadSettings() {
    if (window.electronAPI) {
      this._settings = normalizeSettings(await window.electronAPI.getSettings());
    } else {
      const saved = localStorage.getItem('settings');
      this._settings = normalizeSettings(saved ? JSON.parse(saved) : {});
    }
    return this._settings;
  }

  async saveSettings(settings) {
    this._settings = settings;
    if (window.electronAPI) {
      await window.electronAPI.saveSettings(settings);
    } else {
      localStorage.setItem('settings', JSON.stringify(settings));
    }
  }

  async loadStats() {
    if (window.electronAPI) {
      this._stats = normalizeStats(await window.electronAPI.getStats());
    } else {
      const saved = localStorage.getItem('stats');
      this._stats = normalizeStats(saved ? JSON.parse(saved) : createEmptyStats());
    }
    return this._stats;
  }

  async saveStats(stats) {
    this._stats = stats;
    if (window.electronAPI) {
      await window.electronAPI.saveStats(stats);
    } else {
      localStorage.setItem('stats', JSON.stringify(stats));
    }
  }

  async notifyPomodoroComplete(stats) {
    if (window.electronAPI) {
      await window.electronAPI.pomodoroComplete(stats);
    }
  }

  async notifyBreakComplete() {
    if (window.electronAPI) {
      await window.electronAPI.breakComplete();
    }
  }

  get settings() { return this._settings; }
  get stats() { return this._stats; }
}

window.store = new Store();
window.getLocalDateKey = getLocalDateKey;
