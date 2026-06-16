import { app, desktopCapturer, globalShortcut, screen } from 'electron'
import { SettingsStore } from './settings/settingsStore'
import { OverlayWindowManager } from './windows/overlayWindow'
import { registerIpc } from './ipc/registerIpc'
import { GlobalShortcutManager } from './hotkeys/globalShortcuts'
import { TrayManager } from './tray/trayManager'
import { SongOrchestrator } from './services/songOrchestrator'
import { LyricsOrchestrator } from './services/lyricsOrchestrator'
import { registerLifecycle } from './app/lifecycle'
import { buildSongProviderRegistry } from '../providers/songs'
import { buildLyricsProviderRegistry } from '../providers/lyrics'
import { IpcChannels } from '../shared/types/ipc'
import { KaraokeSyncEngine } from '../engine/KaraokeSyncEngine'
import type { ActiveLines } from '../shared/types/lyrics'

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')

const LYRIC_LEAD_MS = 1000

let overlay: OverlayWindowManager | null = null
let lyricTimer: ReturnType<typeof setInterval> | null = null
let textColorTimer: ReturnType<typeof setInterval> | null = null
let lastTextColor: 'black' | 'white' | null = null

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function estimateLuminanceFromBitmap(
  bitmap: Buffer,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  let sum = 0
  let count = 0

  for (let oy = -2; oy <= 2; oy += 1) {
    for (let ox = -2; ox <= 2; ox += 1) {
      const sx = clamp(x + ox, 0, width - 1)
      const sy = clamp(y + oy, 0, height - 1)
      const i = (sy * width + sx) * 4
      const b = bitmap[i] ?? 0
      const g = bitmap[i + 1] ?? 0
      const r = bitmap[i + 2] ?? 0
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b
      sum += luminance
      count += 1
    }
  }

  return count > 0 ? sum / count : 255
}

async function detectTextColorForOverlay(): Promise<'black' | 'white'> {
  const win = overlay?.window
  if (!win || win.isDestroyed() || !win.isVisible()) return 'black'

  const bounds = win.getBounds()
  const centerX = bounds.x + Math.round(bounds.width / 2)
  const centerY = bounds.y + Math.round(bounds.height / 2)
  const display = screen.getDisplayNearestPoint({ x: centerX, y: centerY })

  const thumbWidth = Math.max(320, Math.floor(display.bounds.width / 4))
  const thumbHeight = Math.max(180, Math.floor(display.bounds.height / 4))
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: thumbWidth, height: thumbHeight },
    fetchWindowIcons: false
  })

  const source =
    sources.find((s) => s.display_id === String(display.id)) ??
    sources.find((s) => s.thumbnail.getSize().width > 0) ??
    null

  if (!source) return 'black'

  const image = source.thumbnail
  const size = image.getSize()
  if (size.width <= 0 || size.height <= 0) return 'black'

  const bitmap = image.toBitmap()
  const rx = (centerX - display.bounds.x) / Math.max(1, display.bounds.width)
  const ry = (centerY - display.bounds.y) / Math.max(1, display.bounds.height)
  const px = clamp(Math.round(rx * (size.width - 1)), 0, size.width - 1)
  const py = clamp(Math.round(ry * (size.height - 1)), 0, size.height - 1)
  const luminance = estimateLuminanceFromBitmap(bitmap, size.width, size.height, px, py)
  return luminance < 140 ? 'white' : 'black'
}

function startAutoTextColorDetection(): void {
  if (textColorTimer) clearInterval(textColorTimer)
  textColorTimer = setInterval(() => {
    detectTextColorForOverlay()
      .then((color) => {
        if (color === lastTextColor) return
        lastTextColor = color
        overlay?.window?.webContents.send(IpcChannels.LYRICS_TEXT_COLOR_CHANGED, color)
      })
      .catch(() => {})
  }, 800)
}

async function bootstrap(): Promise<void> {
  const settings = SettingsStore.load()
  settings.visible = true
  settings.dragMode = false

  // Control Dock visibility from settings
  if (process.platform === 'darwin' && !settings.showInDock) {
    app.dock.hide()
  }

  // Build provider registries (all stubs in Phase 1)
  const songOrchestrator = new SongOrchestrator()
  songOrchestrator.register(...buildSongProviderRegistry())

  const lyricsOrchestrator = new LyricsOrchestrator()
  lyricsOrchestrator.register(...buildLyricsProviderRegistry())
  const karaokeSyncEngine = new KaraokeSyncEngine()
  let playbackStartEpochMs = 0
  let activeTrackKey: string | null = null
  let hasSyncedLyrics = false
  let previousLiveCaption: string | null = null
  let lastLyricsFetchAttemptMs = 0

  overlay = new OverlayWindowManager(settings)
  await overlay.create()
  startAutoTextColorDetection()


  registerIpc(overlay, songOrchestrator, lyricsOrchestrator)
  GlobalShortcutManager.register(overlay, songOrchestrator, lyricsOrchestrator)

  songOrchestrator.startPolling(async (track) => {
    const emptyLines: ActiveLines = { prev: null, current: null, next: null, currentIndex: -1 }

    if (track?.ended) {
      overlay?.window?.webContents.send(IpcChannels.SONG_TRACK_CHANGED, null)
      overlay?.window?.webContents.send(IpcChannels.LYRICS_LINES_CHANGED, emptyLines)
      karaokeSyncEngine.clear()
      activeTrackKey = null
      hasSyncedLyrics = false
      previousLiveCaption = null
      if (lyricTimer) {
        clearInterval(lyricTimer)
        lyricTimer = null
      }
      return
    }

    overlay?.window?.webContents.send(IpcChannels.SONG_TRACK_CHANGED, track)

    if (!track) {
      overlay?.window?.webContents.send(IpcChannels.LYRICS_LINES_CHANGED, emptyLines)
      karaokeSyncEngine.clear()
      activeTrackKey = null
      hasSyncedLyrics = false
      previousLiveCaption = null
      if (lyricTimer) {
        clearInterval(lyricTimer)
        lyricTimer = null
      }
      return
    }

    if (typeof track.positionMs === 'number') {
      playbackStartEpochMs = Date.now() - track.positionMs - LYRIC_LEAD_MS
    }

    const trackKey = `${track.providerId}:${track.artist}:${track.title}`
    if (trackKey !== activeTrackKey) {
      activeTrackKey = trackKey
      lastLyricsFetchAttemptMs = Date.now()
      const lyrics = await lyricsOrchestrator.fetchForTrack(track)
      if (!lyrics) {
        karaokeSyncEngine.clear()
        hasSyncedLyrics = false
      } else {
        karaokeSyncEngine.setLyrics(lyrics)
        hasSyncedLyrics = true
        previousLiveCaption = null
      }
    } else if (!hasSyncedLyrics && Date.now() - lastLyricsFetchAttemptMs > 5000) {
      lastLyricsFetchAttemptMs = Date.now()
      const lyrics = await lyricsOrchestrator.fetchForTrack(track)
      if (lyrics) {
        karaokeSyncEngine.setLyrics(lyrics)
        hasSyncedLyrics = true
        previousLiveCaption = null
      }
    }

    if (hasSyncedLyrics && !lyricTimer) {
      lyricTimer = setInterval(() => {
        const positionMs = Math.max(0, Date.now() - playbackStartEpochMs)
        karaokeSyncEngine.setPositionMs(positionMs)
        overlay?.window?.webContents.send(
          IpcChannels.LYRICS_LINES_CHANGED,
          karaokeSyncEngine.getActiveLines()
        )
      }, 100)
    }

    if (!hasSyncedLyrics) {
      if (lyricTimer) {
        clearInterval(lyricTimer)
        lyricTimer = null
      }
      const liveCaption = track.liveCaptionText?.trim()
      if (!liveCaption) {
        overlay?.window?.webContents.send(IpcChannels.LYRICS_LINES_CHANGED, emptyLines)
        previousLiveCaption = null
        return
      }
      const lines: ActiveLines = {
        prev: previousLiveCaption ? { timeMs: 0, text: previousLiveCaption } : null,
        current: { timeMs: 0, text: liveCaption },
        next: null,
        currentIndex: 0
      }
      previousLiveCaption = liveCaption
      overlay?.window?.webContents.send(IpcChannels.LYRICS_LINES_CHANGED, lines)
    }
  })

  await TrayManager.create(overlay, settings)

  registerLifecycle(() => {
    if (!overlay?.window) {
      bootstrap()
    }
  })
}

app.whenReady().then(bootstrap).catch(console.error)

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (lyricTimer) {
    clearInterval(lyricTimer)
    lyricTimer = null
  }
  if (textColorTimer) {
    clearInterval(textColorTimer)
    textColorTimer = null
  }
})
