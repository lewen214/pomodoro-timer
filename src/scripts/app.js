// Main app - wires everything together
(async function() {
  // DOM elements
  const timerTimeEl = document.getElementById('timer-time');
  const timerLabelEl = document.getElementById('timer-label');
  const ringProgress = document.getElementById('ring-progress');
  const tomatoEl = document.getElementById('tomato');
  const faceEl = document.getElementById('tomato-face');
  const mouthEl = document.getElementById('mouth');
  const btnStart = document.getElementById('btn-start');
  const btnStartIcon = document.getElementById('btn-start-icon');
  const btnStartText = document.getElementById('btn-start-text');
  const btnReset = document.getElementById('btn-reset');
  const btnSkip = document.getElementById('btn-skip');
  const btnSettings = document.getElementById('btn-settings');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsClose = document.getElementById('settings-close');
  const btnMinimize = document.getElementById('btn-minimize');
  const btnClose = document.getElementById('btn-close');
  const modeTabs = document.querySelectorAll('.mode-tab');
  const pomDots = document.querySelectorAll('#pomodoro-dots .dot');

  // Ring circumference
  const RING_CIRCUMFERENCE = 2 * Math.PI * 100; // ~628.32

  // Load settings
  const settings = await window.store.loadSettings();
  document.body.setAttribute('data-theme', settings.theme);

  // Init sound
  window.soundManager.setEnabled(settings.soundEnabled);

  // Init timer
  const timer = new window.Timer();
  timer.setDurations(settings.workDuration, settings.shortBreak, settings.longBreak);
  timer.setMode('work');

  // Init stats
  await window.statsManager.init();

  // Mode labels
  const modeLabels = {
    work: '专注中',
    shortBreak: '短休息',
    longBreak: '长休息'
  };

  const modeStartLabels = {
    work: '开始专注',
    shortBreak: '开始休息',
    longBreak: '开始休息'
  };

  // Update UI
  function updateDisplay() {
    timerTimeEl.textContent = timer.getTimeString();

    // Ring progress
    const progress = timer.getProgress();
    const offset = RING_CIRCUMFERENCE * (1 - progress);
    ringProgress.style.strokeDashoffset = offset;

    // Pulse on last 10 seconds
    if (timer.remainingSeconds <= 10 && timer.isRunning) {
      tomatoEl.classList.add('pulsing');
    } else {
      tomatoEl.classList.remove('pulsing');
    }
  }

  function updateState() {
    // Update button
    if (timer.isRunning) {
      btnStartIcon.textContent = '⏸';
      btnStartText.textContent = '暂停';
      faceEl.className = 'tomato-face focused';
    } else if (timer.isPaused) {
      btnStartIcon.textContent = '▶';
      btnStartText.textContent = '继续';
      faceEl.className = 'tomato-face';
    } else {
      btnStartIcon.textContent = '▶';
      btnStartText.textContent = modeStartLabels[timer.mode];
      faceEl.className = 'tomato-face';
    }

    // Update label
    if (timer.isRunning) {
      timerLabelEl.textContent = modeLabels[timer.mode];
    } else if (timer.isPaused) {
      timerLabelEl.textContent = '已暂停';
    } else {
      timerLabelEl.textContent = '准备开始';
    }

    // Update active tab
    modeTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === timer.mode);
    });

    // Update pomodoro dots
    pomDots.forEach((dot, i) => {
      dot.classList.toggle('filled', i < timer.pomodoroCount);
    });
  }

  // Timer callbacks
  timer.onTick = updateDisplay;
  timer.onStateChange = updateState;

  timer.onComplete = async (type, count) => {
    if (type === 'work') {
      window.soundManager.playComplete();
      const workMin = settings.workDuration;
      await window.statsManager.addPomodoro(workMin);

      // Face celebration
      faceEl.className = 'tomato-face happy';
      setTimeout(() => { faceEl.className = 'tomato-face'; }, 2000);
    } else {
      window.soundManager.playBreakEnd();
      await window.store.notifyBreakComplete();
    }
  };

  // Controls
  btnStart.addEventListener('click', () => {
    window.soundManager.playClick();
    if (timer.isRunning) {
      timer.pause();
    } else {
      timer.start();
    }
  });

  btnReset.addEventListener('click', () => {
    window.soundManager.playClick();
    timer.reset();
  });

  btnSkip.addEventListener('click', () => {
    window.soundManager.playClick();
    timer.skip();
  });

  // Mode tabs
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      window.soundManager.playClick();
      timer.setMode(tab.dataset.mode);
    });
  });

  // Settings
  const setWork = document.getElementById('set-work');
  const setShort = document.getElementById('set-short');
  const setLong = document.getElementById('set-long');
  const setWorkVal = document.getElementById('set-work-val');
  const setShortVal = document.getElementById('set-short-val');
  const setLongVal = document.getElementById('set-long-val');
  const setSound = document.getElementById('set-sound');
  const themeBtns = document.querySelectorAll('.theme-btn');

  function openSettings() {
    setWork.value = settings.workDuration;
    setShort.value = settings.shortBreak;
    setLong.value = settings.longBreak;
    setWorkVal.textContent = settings.workDuration;
    setShortVal.textContent = settings.shortBreak;
    setLongVal.textContent = settings.longBreak;
    setSound.checked = settings.soundEnabled;
    themeBtns.forEach(b => b.classList.toggle('active', b.dataset.theme === settings.theme));
    settingsOverlay.classList.add('open');
  }

  function closeSettings() {
    settingsOverlay.classList.remove('open');
  }

  btnSettings.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) closeSettings();
  });

  // Sliders
  setWork.addEventListener('input', () => {
    setWorkVal.textContent = setWork.value;
    settings.workDuration = parseInt(setWork.value);
    applySettings();
  });
  setShort.addEventListener('input', () => {
    setShortVal.textContent = setShort.value;
    settings.shortBreak = parseInt(setShort.value);
    applySettings();
  });
  setLong.addEventListener('input', () => {
    setLongVal.textContent = setLong.value;
    settings.longBreak = parseInt(setLong.value);
    applySettings();
  });

  setSound.addEventListener('change', () => {
    settings.soundEnabled = setSound.checked;
    window.soundManager.setEnabled(settings.soundEnabled);
    applySettings();
  });

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.theme = btn.dataset.theme;
      document.body.setAttribute('data-theme', settings.theme);
      applySettings();
    });
  });

  function applySettings() {
    window.store.saveSettings(settings);
    timer.setDurations(settings.workDuration, settings.shortBreak, settings.longBreak);
    if (timer.isIdle) {
      timer.setMode(timer.mode); // refresh with new duration
    }
  }

  // Titlebar
  btnMinimize.addEventListener('click', () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeToTray();
    }
  });
  btnClose.addEventListener('click', () => {
    if (window.electronAPI) {
      window.electronAPI.closeApp();
    }
  });

  // Initial render
  updateDisplay();
  updateState();
})();
