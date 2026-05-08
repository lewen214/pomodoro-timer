// Stats display module
class StatsManager {
  constructor() {
    this.countEl = document.getElementById('stat-today-count');
    this.minutesEl = document.getElementById('stat-today-minutes');
    this.totalEl = document.getElementById('stat-total-count');
    this.calendarGridEl = document.getElementById('calendar-grid');
    this.calendarMonthEl = document.getElementById('calendar-month');
    this.calendarSummaryEl = document.getElementById('calendar-summary');
    this.currentMonth = new Date();
  }

  async init() {
    const stats = await window.store.loadStats();
    this.render(stats);
  }

  render(stats) {
    this.countEl.textContent = stats.todayPomodoros;
    this.minutesEl.textContent = stats.todayMinutes;
    this.totalEl.textContent = stats.totalPomodoros;
    this.renderCalendar(stats);
  }

  async addPomodoro(workMinutes) {
    const stats = window.store.stats;
    const today = window.getLocalDateKey();
    if (!stats.history) stats.history = {};
    if (!stats.history[today]) stats.history[today] = { pomodoros: 0, minutes: 0 };

    stats.todayPomodoros++;
    stats.todayMinutes += workMinutes;
    stats.totalPomodoros++;
    stats.totalMinutes += workMinutes;
    stats.todayDate = today;
    stats.history[today].pomodoros = stats.todayPomodoros;
    stats.history[today].minutes = stats.todayMinutes;

    await window.store.saveStats(stats);
    await window.store.notifyPomodoroComplete(stats);
    this.render(stats);
  }

  changeMonth(offset) {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + offset,
      1
    );
    this.renderCalendar(window.store.stats);
  }

  renderCalendar(stats) {
    if (!this.calendarGridEl) return;

    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingDays = firstDay.getDay();
    const todayKey = window.getLocalDateKey();
    const history = stats.history || {};
    let monthPomodoros = 0;
    let monthMinutes = 0;

    this.calendarMonthEl.textContent = `${year}年${month + 1}月`;
    this.calendarGridEl.innerHTML = '';

    ['日', '一', '二', '三', '四', '五', '六'].forEach((label) => {
      const weekday = document.createElement('div');
      weekday.className = 'calendar-weekday';
      weekday.textContent = label;
      this.calendarGridEl.appendChild(weekday);
    });

    for (let i = 0; i < leadingDays; i++) {
      const empty = document.createElement('div');
      empty.className = 'calendar-day empty';
      this.calendarGridEl.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const key = window.getLocalDateKey(new Date(year, month, day));
      const entry = history[key] || { pomodoros: 0, minutes: 0 };
      monthPomodoros += entry.pomodoros;
      monthMinutes += entry.minutes;

      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      if (key === todayKey) cell.classList.add('today');
      if (entry.pomodoros > 0) cell.classList.add('has-focus');
      cell.title = `${key}: ${entry.pomodoros} 次 / ${entry.minutes} 分钟`;
      cell.innerHTML = `
        <span class="calendar-date">${day}</span>
        <span class="calendar-count">${entry.pomodoros || ''}</span>
        <span class="calendar-minutes">${entry.minutes ? `${entry.minutes}m` : ''}</span>
      `;
      this.calendarGridEl.appendChild(cell);
    }

    this.calendarSummaryEl.textContent = `本月 ${monthPomodoros} 次专注 · ${monthMinutes} 分钟`;
  }
}

window.statsManager = new StatsManager();
