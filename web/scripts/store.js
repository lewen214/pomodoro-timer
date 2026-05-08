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
    legacyPomodoros: 0,
    legacyMinutes: 0,
    history: {},
    legacyHistory: {},
    sessions: [],
  };
}

function normalizeSettings(settings = {}) {
  return { ...DEFAULT_SETTINGS, ...settings };
}

function normalizeStats(stats = createEmptyStats()) {
  const today = getLocalDateKey();
  const normalized = { ...createEmptyStats(today), ...stats };
  normalized.history = normalized.history || {};
  normalized.legacyHistory = normalized.legacyHistory || {};
  normalized.sessions = Array.isArray(normalized.sessions) ? normalized.sessions : [];
  const parsedLegacyDate = new Date(normalized.todayDate);
  const storedDateKey = Number.isNaN(parsedLegacyDate.getTime())
    ? normalized.todayDate
    : getLocalDateKey(parsedLegacyDate);

  if (
    normalized.sessions.length === 0 &&
    normalized.legacyPomodoros === 0 &&
    normalized.legacyMinutes === 0 &&
    (normalized.totalPomodoros > 0 || normalized.totalMinutes > 0)
  ) {
    normalized.legacyPomodoros = normalized.totalPomodoros;
    normalized.legacyMinutes = normalized.totalMinutes;
  }

  if (storedDateKey && !normalized.history[storedDateKey]) {
    normalized.history[storedDateKey] = {
      pomodoros: normalized.todayPomodoros || 0,
      minutes: normalized.todayMinutes || 0,
    };
  }

  if (Object.keys(normalized.legacyHistory).length === 0) {
    normalized.legacyHistory = { ...normalized.history };
  }

  return recalculateStats(normalized);
}

function recalculateStats(stats) {
  const today = getLocalDateKey();
  const history = {};
  let sessionPomodoros = 0;
  let sessionMinutes = 0;

  Object.entries(stats.legacyHistory || {}).forEach(([dateKey, entry]) => {
    history[dateKey] = {
      pomodoros: Number(entry.pomodoros) || 0,
      minutes: Number(entry.minutes) || 0,
    };
  });

  stats.sessions.forEach((session) => {
    const dateKey = session.date || getLocalDateKey(new Date(session.endAt || session.startAt));
    const minutes = Number(session.minutes) || 0;
    if (!history[dateKey]) history[dateKey] = { pomodoros: 0, minutes: 0 };
    history[dateKey].pomodoros++;
    history[dateKey].minutes += minutes;
    sessionPomodoros++;
    sessionMinutes += minutes;
  });

  if (!history[today]) history[today] = { pomodoros: 0, minutes: 0 };

  stats.history = history;
  stats.todayDate = today;
  stats.todayPomodoros = history[today].pomodoros;
  stats.todayMinutes = history[today].minutes;
  stats.totalPomodoros = (Number(stats.legacyPomodoros) || 0) + sessionPomodoros;
  stats.totalMinutes = (Number(stats.legacyMinutes) || 0) + sessionMinutes;
  return stats;
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
window.recalculateStats = recalculateStats;
