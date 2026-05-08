// Stats display module
class StatsManager {
  constructor() {
    this.countEl = document.getElementById('stat-today-count');
    this.minutesEl = document.getElementById('stat-today-minutes');
    this.totalEl = document.getElementById('stat-total-count');
  }

  async init() {
    const stats = await window.store.loadStats();
    this.render(stats);
  }

  render(stats) {
    this.countEl.textContent = stats.todayPomodoros;
    this.minutesEl.textContent = stats.todayMinutes;
    this.totalEl.textContent = stats.totalPomodoros;
  }

  async addPomodoro(workMinutes) {
    const stats = window.store.stats;
    stats.todayPomodoros++;
    stats.todayMinutes += workMinutes;
    stats.totalPomodoros++;
    stats.totalMinutes += workMinutes;
    await window.store.saveStats(stats);
    await window.store.notifyPomodoroComplete(stats);
    this.render(stats);
  }
}

window.statsManager = new StatsManager();
