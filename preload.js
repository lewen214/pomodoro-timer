const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getStats: () => ipcRenderer.invoke('get-stats'),
  saveStats: (stats) => ipcRenderer.invoke('save-stats', stats),
  pomodoroComplete: (stats) => ipcRenderer.invoke('pomodoro-complete', stats),
  breakComplete: () => ipcRenderer.invoke('break-complete'),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  closeApp: () => ipcRenderer.invoke('close-app')
});
