import { app, globalShortcut } from 'electron'
import { SettingsStore } from './settings/settingsStore'
import { SettingsService } from './settings/settingsService'
import { SyncOffsetStore } from './settings/syncOffsetStore'
import { OverlayWindowManager } from './windows/overlayWindow'
import { SettingsWindowManager } from './windows/settingsWindow'
import { OnboardingWindowManager } from './windows/onboardingWindow'
import { registerIpc } from './ipc/registerIpc'
import { GlobalShortcutManager } from './hotkeys/globalShortcuts'
import { TrayManager } from './tray/trayManager'
import { SongOrchestrator } from './services/songOrchestrator'
import { LyricsOrchestrator } from './services/lyricsOrchestrator'
import { registerLifecycle } from './app/lifecycle'
import { startUpdateCheck } from './services/updateService'
import { buildSongProviderRegistry } from '../providers/songs'
import { buildLyricsProviderRegistry } from '../providers/lyrics'
import { resolveEnabledProviderIds } from '../shared/constants/songSources'
import { IpcChannels } from '../shared/types/ipc'
import { KaraokeSyncEngine } from '../engine/KaraokeSyncEngine'
import { buildTrackKey } from '../shared/utils/trackKey'
import { applyLyricsScriptToActiveLines } from '../shared/utils/lyricsTransliteration'
import { sessionLog } from './debug/sessionLog'
import {
  initOverlayVisibility,
  setAutoShowEnabled,
  syncOverlayVisibility
} from './services/overlayVisibility'
import type { ActiveLines } from '../shared/types/lyrics'
import type { NowPlayingTrack } from '../shared/types/song'
import type { OverlaySettings } from '../shared/types/settings'

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')

let overlay: OverlayWindowManager | null = null
let settingsService: SettingsService | null = null
let settingsWindow: SettingsWindowManager | null = null
let onboardingWindow: OnboardingWindowManager | null = null
let lyricTimer: ReturnType<typeof setInterval> | null = null
let currentSettings: OverlaySettings | null = null
let currentTrack: NowPlayingTrack | null = null
let currentTrackKey: string | null = null
let playbackStartEpochMs = 0
let karaokeSyncEngine: KaraokeSyncEngine | null = null

function getTotalSyncOffsetMs(trackKey: string | null): number {
  const lead = currentSettings?.lyricLeadMs ?? 1000
  const perTrack = trackKey ? SyncOffsetStore.get(trackKey) : 0
  return lead + perTrack
}

function updatePlaybackEpoch(track: NowPlayingTrack, trackKey: string): void {
  if (typeof track.positionMs !== 'number') return
  playbackStartEpochMs = Date.now() - track.positionMs - getTotalSyncOffsetMs(trackKey)
}

async function bootstrap(): Promise<void> {
  const settings = SettingsStore.load()
  currentSettings = settings

  if (process.platform === 'darwin' && !settings.showInDock) {
    app.dock.hide()
  }

  const songOrchestrator = new SongOrchestrator()
  songOrchestrator.register(...buildSongProviderRegistry())
  songOrchestrator.setEnabledProviderIds(resolveEnabledProviderIds(settings))

  const lyricsOrchestrator = new LyricsOrchestrator()
  lyricsOrchestrator.register(...buildLyricsProviderRegistry())
  karaokeSyncEngine = new KaraokeSyncEngine()

  let activeTrackKey: string | null = null
  let hasSyncedLyrics = false
  let previousLiveCaption: string | null = null
  let lastLyricsFetchAttemptMs = 0
  let lyricsFetchGeneration = 0

  const emptyLines: ActiveLines = {
    prev: null,
    current: null,
    next: null,
    currentIndex: -1,
    activeWordIndex: -1
  }

  function sendLyricsLines(lines: ActiveLines): void {
    const mode = currentSettings?.lyricsScriptMode ?? 'romanized'
    const displayLines = applyLyricsScriptToActiveLines(lines, mode)
    // #region agent log
    if (mode === 'romanized' && lines.current?.text && displayLines.current?.text !== lines.current.text) {
      sessionLog(
        'index.ts:sendLyricsLines',
        'romanized lyrics for display',
        {
          originalPreview: lines.current.text.slice(0, 60),
          romanizedPreview: displayLines.current?.text?.slice(0, 60) ?? null
        },
        'H7'
      )
    }
    // #endregion
    overlay?.window?.webContents.send(IpcChannels.LYRICS_LINES_CHANGED, displayLines)
  }

  function refreshLyricsDisplay(): void {
    if (hasSyncedLyrics && karaokeSyncEngine) {
      sendLyricsLines(karaokeSyncEngine.getActiveLines() ?? emptyLines)
      return
    }
    if (previousLiveCaption && currentTrack) {
      sendLyricsLines({
        prev: null,
        current: { timeMs: 0, text: previousLiveCaption },
        next: null,
        currentIndex: 0,
        activeWordIndex: -1
      })
    }
  }

  async function applyLyricsForTrack(
    track: NowPlayingTrack,
    trackKey: string,
    generation: number,
    reason: string
  ): Promise<void> {
    const lyrics = await lyricsOrchestrator.fetchForTrack(track)

    if (generation !== lyricsFetchGeneration || trackKey !== activeTrackKey) {
      // #region agent log
      sessionLog(
        'index.ts:applyLyricsForTrack',
        'stale lyrics fetch discarded',
        {
          reason,
          trackKey,
          activeTrackKey,
          generation,
          currentGeneration: lyricsFetchGeneration,
          foundLyrics: Boolean(lyrics)
        },
        'H8'
      )
      // #endregion
      return
    }

    // #region agent log
    sessionLog(
      'index.ts:lyricsFetch',
      'lyrics fetch applied',
      {
        reason,
        trackKey,
        foundLyrics: Boolean(lyrics),
        lineCount: lyrics?.lines.length ?? 0,
        firstLine: lyrics?.lines[0]?.text?.slice(0, 60) ?? null
      },
      'H3-H4'
    )
    // #endregion

    if (!lyrics) {
      karaokeSyncEngine?.clear()
      hasSyncedLyrics = false
    } else {
      karaokeSyncEngine?.setLyrics(lyrics)
      hasSyncedLyrics = true
      previousLiveCaption = null
    }
  }

  overlay = new OverlayWindowManager(settings)
  await overlay.create()
  initOverlayVisibility(overlay)

  if (settings.dragMode) overlay.setDragMode(true)
  else overlay.setClickThrough(settings.clickThrough)

  settingsService = new SettingsService(overlay, settings)
  settingsService.onChange((next) => {
    const prevScriptMode = currentSettings?.lyricsScriptMode
    currentSettings = next
    songOrchestrator.setEnabledProviderIds(resolveEnabledProviderIds(next))
    if (prevScriptMode !== next.lyricsScriptMode) {
      refreshLyricsDisplay()
    }
  })
  settingsWindow = new SettingsWindowManager(overlay)
  onboardingWindow = new OnboardingWindowManager(overlay)

  settingsService.broadcastCurrent()

  registerIpc(
    overlay,
    settingsService,
    songOrchestrator,
    lyricsOrchestrator
  )

  GlobalShortcutManager.register(overlay, songOrchestrator, lyricsOrchestrator, {
    getCurrentTrackKey: () => currentTrackKey,
    adjustOffset: (deltaMs: number) => {
      if (!currentTrackKey || !currentTrack) return
      const next = SyncOffsetStore.get(currentTrackKey) + deltaMs
      SyncOffsetStore.set(currentTrackKey, next)
      updatePlaybackEpoch(currentTrack, currentTrackKey)
      console.log(`[Sync] Offset for current track: ${next}ms`)
    },
    resetOffset: () => {
      if (!currentTrackKey || !currentTrack) return
      SyncOffsetStore.reset(currentTrackKey)
      updatePlaybackEpoch(currentTrack, currentTrackKey)
      console.log('[Sync] Offset reset for current track')
    }
  })

  songOrchestrator.startPolling(async (track) => {
    syncOverlayVisibility(track)

    currentTrack = track
    lyricsOrchestrator.setCurrentTrack(track)

    if (track?.ended) {
      overlay?.window?.webContents.send(IpcChannels.SONG_TRACK_CHANGED, null)
      sendLyricsLines(emptyLines)
      karaokeSyncEngine?.clear()
      activeTrackKey = null
      currentTrackKey = null
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
      sendLyricsLines(emptyLines)
      karaokeSyncEngine?.clear()
      activeTrackKey = null
      currentTrackKey = null
      hasSyncedLyrics = false
      previousLiveCaption = null
      if (lyricTimer) {
        clearInterval(lyricTimer)
        lyricTimer = null
      }
      return
    }

    const trackKey = buildTrackKey(track)
    currentTrackKey = trackKey

    // #region agent log
    sessionLog(
      'index.ts:songPoll',
      'track polled',
      {
        title: track.title,
        artist: track.artist,
        providerId: track.providerId,
        sourceUrl: track.sourceUrl ?? null,
        trackKey,
        activeTrackKey,
        trackKeyChanged: trackKey !== activeTrackKey,
        hasSyncedLyrics,
        lyricTimerActive: lyricTimer !== null,
        liveCaptionLen: track.liveCaptionText?.trim().length ?? 0
      },
      'H1-H3-H5'
    )
    // #endregion

    if (typeof track.positionMs === 'number') {
      updatePlaybackEpoch(track, trackKey)
    }

    if (trackKey !== activeTrackKey) {
      if (lyricTimer) {
        clearInterval(lyricTimer)
        lyricTimer = null
      }
      karaokeSyncEngine?.clear()
      hasSyncedLyrics = false
      previousLiveCaption = null
      sendLyricsLines(emptyLines)

      lyricsFetchGeneration += 1
      lyricsOrchestrator.invalidateMemoryCache()
      activeTrackKey = trackKey
      const generation = lyricsFetchGeneration
      await applyLyricsForTrack(track, trackKey, generation, 'track-change')
    } else if (!hasSyncedLyrics && Date.now() - lastLyricsFetchAttemptMs > 5000) {
      lyricsFetchGeneration += 1
      const generation = lyricsFetchGeneration
      lastLyricsFetchAttemptMs = Date.now()
      await applyLyricsForTrack(track, trackKey, generation, 'retry')
    }

    if (hasSyncedLyrics && !lyricTimer) {
      lyricTimer = setInterval(() => {
        const positionMs = Math.max(0, Date.now() - playbackStartEpochMs)
        karaokeSyncEngine?.setPositionMs(positionMs)
        sendLyricsLines(karaokeSyncEngine?.getActiveLines() ?? emptyLines)
      }, 100)
    }

    if (!hasSyncedLyrics) {
      if (lyricTimer) {
        clearInterval(lyricTimer)
        lyricTimer = null
      }
      const liveCaption = track.liveCaptionText?.trim()
      if (!liveCaption) {
        sendLyricsLines(emptyLines)
        previousLiveCaption = null
        return
      }
      // #region agent log
      sessionLog(
        'index.ts:liveCaption',
        'showing live caption fallback',
        {
          trackKey,
          captionPreview: liveCaption.slice(0, 80)
        },
        'H5'
      )
      // #endregion
      const lines: ActiveLines = {
        prev: previousLiveCaption ? { timeMs: 0, text: previousLiveCaption } : null,
        current: { timeMs: 0, text: liveCaption },
        next: null,
        currentIndex: 0,
        activeWordIndex: -1
      }
      previousLiveCaption = liveCaption
      sendLyricsLines(lines)
    }
  })

  await TrayManager.create(overlay, settings, {
    openSettings: () => {
      void settingsWindow?.open().catch((err) => {
        console.error('[Tray] Failed to open settings:', err)
      })
    },
    openOnboarding: () => {
      setAutoShowEnabled(false)
      void onboardingWindow?.open(() => {
        setAutoShowEnabled(true)
      }).catch((err) => {
        console.error('[Tray] Failed to open onboarding:', err)
      })
    },
    updateSettings: (patch) => {
      const next = settingsService?.update(patch) ?? SettingsStore.update(patch)
      Object.assign(settings, next)
      if (patch.lyricsScriptMode !== undefined) {
        refreshLyricsDisplay()
      }
    }
  })

  if (!settings.onboardingComplete) {
    setAutoShowEnabled(false)
    setTimeout(() => {
      void onboardingWindow?.open(() => {
        setAutoShowEnabled(true)
      }).catch((err) => {
        console.error('[Bootstrap] Failed to open onboarding:', err)
      })
    }, 300)
  }

  registerLifecycle(() => {
    if (!overlay?.window) {
      bootstrap()
    }
  })

  startUpdateCheck()
}

app.whenReady().then(bootstrap).catch(console.error)

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (lyricTimer) {
    clearInterval(lyricTimer)
    lyricTimer = null
  }
})
