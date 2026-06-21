# goLyrics Architecture

## Overview

goLyrics is an Electron macOS desktop app that displays karaoke-style synchronized lyrics as a transparent, always-on-top overlay while music plays from any source.

## Process Model

```
┌──────────────────────────────────────────┐
│               Main Process               │
│                                          │
│  AppLifecycle ──► OverlayWindowManager   │
│        │               │                 │
│  TrayManager    GlobalShortcutManager    │
│        │               │                 │
│  SettingsStore ◄────────┘                │
│        │                                 │
│  SongOrchestrator ──► SongProviders      │
│  LyricsOrchestrator ► LyricsProviders    │
└───────────────┬──────────────────────────┘
                │ IPC (typed via contextBridge)
┌───────────────▼──────────────────────────┐
│            Preload Bridge                │
│   window.goLyrics = { ... }          │
└───────────────┬──────────────────────────┘
                │
┌───────────────▼──────────────────────────┐
│           Renderer Process               │
│                                          │
│  App.tsx                                 │
│   └── OverlayShell                       │
│        ├── DragHandle (drag mode only)   │
│        └── KaraokeDisplay                │
│             └── KaraokeSyncEngine        │
└──────────────────────────────────────────┘
```

## Layer Responsibilities

| Layer | File(s) | Responsibility |
|-------|---------|----------------|
| Main entry | `src/main/index.ts` | Bootstrap, wire all managers |
| Lifecycle | `src/main/app/lifecycle.ts` | `app.whenReady`, quit, activate |
| Overlay window | `src/main/windows/overlayWindow.ts` | BrowserWindow lifecycle, click-through, drag mode, bounds persistence |
| Tray | `src/main/tray/trayManager.ts` | Menu bar icon + context menu (left-click opens menu; show/hide via menu or Option+L) |
| Hotkeys | `src/main/hotkeys/globalShortcuts.ts` | Global keyboard shortcuts |
| IPC handlers | `src/main/ipc/registerIpc.ts` | Route renderer ↔ main calls |
| Settings | `src/main/settings/settingsStore.ts` | electron-store persistence |
| Song orchestrator | `src/main/services/songOrchestrator.ts` | Provider polling loop (filters by Settings → Sources) |
| Lyrics orchestrator | `src/main/services/lyricsOrchestrator.ts` | Fetch/cache lyrics |
| Preload | `src/preload/index.ts` | contextBridge typed API |
| Shared types | `src/shared/types/` | IPC contracts, domain types |
| Song providers | `src/providers/songs/` | Platform-specific now-playing detection |
| Lyrics providers | `src/providers/lyrics/` | LRC fetch/parse |
| Sync engine | `src/engine/KaraokeSyncEngine.ts` | Match position to LRC lines |
| Renderer | `src/renderer/` | React overlay UI |

## macOS Overlay Window Settings

The overlay uses a `panel`-type BrowserWindow so it appears above fullscreen apps:

```ts
type: 'panel'                       // NSPanel, not NSWindow
win.setAlwaysOnTop(true, 'screen-saver', 1)  // highest level
win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
win.setIgnoreMouseEvents(true, { forward: true })  // click-through
```

## Click-Through vs Drag Mode

macOS does not support per-region mouse event ignoring without native code.
goLyrics uses a **drag mode toggle** to switch behavior:

- **Default** (click-through ON): `setIgnoreMouseEvents(true, { forward: true })` — clicks pass to the app below.
- **Drag mode ON**: `setIgnoreMouseEvents(false)` — the overlay receives mouse events. The drag handle bar uses `-webkit-app-region: drag`.

Toggle via: Tray menu → "Toggle Drag Mode"

## IPC Contract

All IPC is defined in `src/shared/types/ipc.ts`. The preload bridge (`src/preload/index.ts`) exposes exactly these methods on `window.goLyrics`. The renderer never calls `ipcRenderer` directly.

## Settings Persistence

`electron-store` writes to: `~/Library/Application Support/goLyrics/config.json`

Fields: x, y, width, height, visible, clickThrough, dragMode, showInDock, opacity, plus song source toggles (`enableMacOSNowPlaying`, `enableSpotify`, `enableAppleMusic`, `youtubeBrowser`).

## Selective Song Polling

Settings → **Sources** controls which song providers `SongOrchestrator` polls every 500ms. Only enabled provider IDs (resolved via `src/shared/constants/songSources.ts`) run `isAvailable()` / `getNowPlaying()`. Existing users upgrading without new keys get legacy behavior (all sources). New installs default to macOS Now Playing + Chrome YouTube only.

Overlay position: drag or tray **Position** nudges set `useCustomPosition` in settings; `create()` respects saved bounds on restart. **Reset to Bottom** clears custom placement.

## Phase Roadmap

| Phase | Focus |
|-------|-------|
| 1 | Architecture, overlay window, hotkeys, tray, stubs |
| 2 | LRC parser, karaoke sync engine, local .lrc loading |
| 3 | Real song detection (macOS Now Playing, Spotify, Apple Music, Chrome) |
| 4 | Auto lyric fetch (LRCLIB / Musixmatch), cache layer |
| 5 | Settings window, onboarding wizard, lyrics cache, signed releases |
