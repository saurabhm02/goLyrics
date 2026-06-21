import { globalShortcut, app } from 'electron'
import { Hotkeys } from '../../shared/constants/hotkeys'
import { IpcChannels } from '../../shared/types/ipc'
import { SYNC_OFFSET_STEP_MS } from '../../shared/constants/defaults'
import type { OverlayWindowManager } from '../windows/overlayWindow'
import type { SongOrchestrator } from '../services/songOrchestrator'
import type { LyricsOrchestrator } from '../services/lyricsOrchestrator'
import { toggleOverlayWithDismiss } from '../services/overlayVisibility'

export interface SyncOffsetHandlers {
  getCurrentTrackKey: () => string | null
  adjustOffset: (deltaMs: number) => void
  resetOffset: () => void
}

export const GlobalShortcutManager = {
  register(
    overlay: OverlayWindowManager,
    songOrchestrator: SongOrchestrator,
    lyricsOrchestrator: LyricsOrchestrator,
    syncHandlers: SyncOffsetHandlers
  ): void {
    const registrations: Array<{ accelerator: string; handler: () => void }> = [
      {
        accelerator: Hotkeys.TOGGLE_OVERLAY,
        handler: () => {
          toggleOverlayWithDismiss()
        }
      },
      {
        accelerator: Hotkeys.REFRESH_SONG,
        handler: () => {
          songOrchestrator.refresh().then((track) => {
            console.log('[Hotkey] Song refresh:', track?.title ?? 'no track detected')
            overlay.window?.webContents.send(IpcChannels.SONG_TRACK_CHANGED, track)
          })
        }
      },
      {
        accelerator: Hotkeys.RELOAD_LYRICS,
        handler: () => {
          lyricsOrchestrator.reload().then(() => {
            console.log('[Hotkey] Lyrics reloaded')
          })
        }
      },
      {
        accelerator: Hotkeys.SYNC_EARLIER,
        handler: () => {
          syncHandlers.adjustOffset(-SYNC_OFFSET_STEP_MS)
        }
      },
      {
        accelerator: Hotkeys.SYNC_LATER,
        handler: () => {
          syncHandlers.adjustOffset(SYNC_OFFSET_STEP_MS)
        }
      },
      {
        accelerator: Hotkeys.SYNC_RESET,
        handler: () => {
          syncHandlers.resetOffset()
        }
      }
    ]

    for (const { accelerator, handler } of registrations) {
      const ok = globalShortcut.register(accelerator, handler)
      if (!ok) {
        console.warn(`[GlobalShortcuts] Failed to register: ${accelerator}`)
      } else {
        console.log(`[GlobalShortcuts] Registered: ${accelerator}`)
      }
    }

    app.on('will-quit', () => {
      globalShortcut.unregisterAll()
    })
  },

  unregisterAll(): void {
    globalShortcut.unregisterAll()
  }
}
