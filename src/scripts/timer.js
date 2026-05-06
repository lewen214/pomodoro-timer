// Timer state machine
class Timer {
  constructor() {
    this.mode = 'work'; // 'work' | 'shortBreak' | 'longBreak'
    this.state = 'idle'; // 'idle' | 'running' | 'paused'
    this.totalSeconds = 0;
    this.remainingSeconds = 0;
    this.interval = null;
    this.pomodoroCount = 0; // completed pomodoros in current cycle
    this.onTick = null;
    this.onComplete = null;
    this.onStateChange = null;
  }

  setDurations(work, shortBreak, longBreak) {
    this.durations = { work: work * 60, shortBreak: shortBreak * 60, longBreak: longBreak * 60 };
  }

  setMode(mode) {
    if (this.state === 'running') return;
    this.mode = mode;
    this.totalSeconds = this.durations[mode];
    this.remainingSeconds = this.totalSeconds;
    this.state = 'idle';
    this.onStateChange?.();
    this.onTick?.();
  }

  start() {
    if (this.state === 'running') return;
    if (this.state === 'idle') {
      this.totalSeconds = this.durations[this.mode];
      this.remainingSeconds = this.totalSeconds;
    }
    this.state = 'running';
    this.onStateChange?.();

    this.interval = setInterval(() => {
      this.remainingSeconds--;
      this.onTick?.();

      if (this.remainingSeconds <= 0) {
        this.complete();
      }
    }, 1000);
  }

  pause() {
    if (this.state !== 'running') return;
    clearInterval(this.interval);
    this.interval = null;
    this.state = 'paused';
    this.onStateChange?.();
  }

  reset() {
    clearInterval(this.interval);
    this.interval = null;
    this.totalSeconds = this.durations[this.mode];
    this.remainingSeconds = this.totalSeconds;
    this.state = 'idle';
    this.onStateChange?.();
    this.onTick?.();
  }

  skip() {
    clearInterval(this.interval);
    this.interval = null;
    this.remainingSeconds = 0;
    this.complete();
  }

  complete() {
    clearInterval(this.interval);
    this.interval = null;
    this.state = 'idle';

    const completedMode = this.mode;

    if (completedMode === 'work') {
      this.pomodoroCount++;
      this.onComplete?.('work', this.pomodoroCount);
    } else {
      this.onComplete?.('break', 0);
    }

    // Auto-switch to next mode
    if (completedMode === 'work') {
      if (this.pomodoroCount >= 4) {
        this.mode = 'longBreak';
        this.pomodoroCount = 0;
      } else {
        this.mode = 'shortBreak';
      }
    } else {
      this.mode = 'work';
    }

    this.totalSeconds = this.durations[this.mode];
    this.remainingSeconds = this.totalSeconds;
    this.onStateChange?.();
    this.onTick?.();
  }

  getProgress() {
    if (this.totalSeconds === 0) return 0;
    return 1 - (this.remainingSeconds / this.totalSeconds);
  }

  getTimeString() {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  get isRunning() { return this.state === 'running'; }
  get isPaused() { return this.state === 'paused'; }
  get isIdle() { return this.state === 'idle'; }
}

window.Timer = Timer;
