// Store bridge - wraps electron IPC for settings and stats
class Store {
  constructor() {
    this._settings = null;
    this._stats = null;
  }

  async loadSettings() {
    if (window.electronAPI) {
      this._settings = await window.electronAPI.getSettings();
    } else {
      // Fallback for dev without electron
      const saved = localStorage.getItem('settings');
      this._settings = saved ? JSON.parse(saved) : {
        workDuration: 25, shortBreak: 5, longBreak: 15,
        pomodorosUntilLong: 4, theme: 'tomato', soundEnabled: true
      };
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
      this._stats = await window.electronAPI.getStats();
    } else {
      const saved = localStorage.getItem('stats');
      const today = new Date().toDateString();
      if (saved) {
        this._stats = JSON.parse(saved);
        if (this._stats.todayDate !== today) {
          this._stats.todayDate = today;
          this._stats.todayPomodoros = 0;
          this._stats.todayMinutes = 0;
        }
      } else {
        this._stats = {
          todayDate: today, todayPomodoros: 0, todayMinutes: 0,
          totalPomodoros: 0, totalMinutes: 0
        };
      }
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
