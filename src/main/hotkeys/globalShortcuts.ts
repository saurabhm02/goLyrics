import { globalShortcut, app } from 'electron'
import { Hotkeys } from '../../shared/constants/hotkeys'
import { IpcChannels } from '../../shared/types/ipc'
import type { OverlayWindowManager } from '../windows/overlayWindow'
import type { SongOrchestrator } from '../services/songOrchestrator'
import type { LyricsOrchestrator } from '../services/lyricsOrchestrator'

export const GlobalShortcutManager = {
  register(
    overlay: OverlayWindowManager,
    songOrchestrator: SongOrchestrator,
    lyricsOrchestrator: LyricsOrchestrator
  ): void {
    const registrations: Array<{ accelerator: string; handler: () => void }> = [
      {
        accelerator: Hotkeys.TOGGLE_OVERLAY,
        handler: () => {
          overlay.toggle()
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
