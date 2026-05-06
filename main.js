const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({
  defaults: {
    settings: {
      workDuration: 25,
      shortBreak: 5,
      longBreak: 15,
      pomodorosUntilLong: 4,
      theme: 'tomato',
      soundEnabled: true
    },
    stats: {
      todayDate: new Date().toDateString(),
      todayPomodoros: 0,
      todayMinutes: 0,
      totalPomodoros: 0,
      totalMinutes: 0
    }
  }
});

let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 580,
    frame: false,
    transparent: false,
    resizable: false,
    icon: path.join(__dirname, 'src/assets/icons/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  // Create a simple tray icon programmatically
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  updateTrayMenu();
  tray.setToolTip('番茄钟');
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayMenu() {
  const stats = store.get('stats');
  const settings = store.get('settings');
  const contextMenu = Menu.buildFromTemplate([
    { label: `今日完成: ${stats.todayPomodoros} 个番茄`, enabled: false },
    { label: `今日专注: ${stats.todayMinutes} 分钟`, enabled: false },
    { type: 'separator' },
    { label: '显示主窗口', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: '退出', click: () => { app.quit(); } }
  ]);
  tray?.setContextMenu(contextMenu);
}

// IPC handlers
ipcMain.handle('get-settings', () => store.get('settings'));
ipcMain.handle('save-settings', (_, settings) => {
  store.set('settings', settings);
});
ipcMain.handle('get-stats', () => {
  // Reset daily stats if date changed
  const stats = store.get('stats');
  const today = new Date().toDateString();
  if (stats.todayDate !== today) {
    stats.todayDate = today;
    stats.todayPomodoros = 0;
    stats.todayMinutes = 0;
    store.set('stats', stats);
  }
  return stats;
});
ipcMain.handle('save-stats', (_, stats) => {
  store.set('stats', stats);
  updateTrayMenu();
});
ipcMain.handle('pomodoro-complete', (_, stats) => {
  store.set('stats', stats);
  updateTrayMenu();
  new Notification({
    title: '番茄钟',
    body: `太棒了！已完成 ${stats.todayPomodoros} 个番茄，继续加油！`
  }).show();
});
ipcMain.handle('break-complete', () => {
  new Notification({
    title: '番茄钟',
    body: '休息结束，准备开始新的番茄吧！'
  }).show();
});
ipcMain.handle('minimize-to-tray', () => {
  mainWindow?.hide();
});
ipcMain.handle('close-app', () => {
  app.quit();
});

app.whenReady().then(() => {
  createWindow();
  // Tray disabled by default on Windows (no icon file), enable if icon exists
  // createTray();
});

app.on('window-all-closed', () => {
  app.quit();
});
