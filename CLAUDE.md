# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

拟物番茄风格桌面番茄钟 (Pomodoro Timer) — 一个基于 Electron 的桌面番茄工作法计时器，带有可爱的番茄造型 UI。

## Commands

- `npm start` — 启动应用
- `npm run dev` — 开发模式启动
- `npm install` — 安装依赖

## Architecture

**Electron 主进程** (`main.js`):
- 创建无边框窗口 (420x580, 不可调整大小)
- 通过 `electron-store` 持久化设置和统计数据
- 托盘菜单（当前默认禁用，缺少 icon 文件）
- IPC 处理器：设置读写、统计管理、番茄完成通知、休息结束通知

**Preload 脚本** (`preload.js`):
- 通过 `contextBridge` 暴露 `window.electronAPI`，所有主进程通信走 IPC invoke

**渲染进程** (`src/`):
- `scripts/timer.js` — 计时器核心逻辑（工作/短休息/长休息模式切换）
- `scripts/store.js` — 通过 electronAPI 桥接主进程的持久化存储
- `scripts/stats.js` — 统计数据管理（今日/累计番茄数和分钟数）
- `scripts/sounds.js` — 音效播放
- `scripts/app.js` — UI 交互、事件绑定、番茄状态动画
- `styles/main.css` — 拟物番茄主题样式（支持 tomato/forest/ocean 三套主题）

## Key Design Decisions

- `contextIsolation: true`, `nodeIntegration: false` — 安全的 IPC 通信模式
- 每日统计在 `get-stats` IPC 中自动按日期重置
- 番茄完成后通过主进程发送系统通知
- SVG 环形进度条 + CSS 拟物番茄造型
