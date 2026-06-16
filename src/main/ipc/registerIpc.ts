import { ipcMain } from 'electron'
import { IpcChannels } from './channels'
import type { OverlayWindowManager } from '../windows/overlayWindow'
import type { SongOrchestrator } from '../services/songOrchestrator'
import type { LyricsOrchestrator } from '../services/lyricsOrchestrator'
import { SettingsStore } from '../settings/settingsStore'
import type { OverlaySettings } from '../../shared/types/settings'

export function registerIpc(
  overlay: OverlayWindowManager,
  songOrchestrator: SongOrchestrator,
  lyricsOrchestrator: LyricsOrchestrator
): void {
  // ---- Overlay control ----
  ipcMain.handle(IpcChannels.OVERLAY_TOGGLE, () => {
    overlay.toggle()
    return overlay.getState()
  })

  ipcMain.handle(IpcChannels.OVERLAY_GET_STATE, () => {
    return overlay.getState()
  })

  ipcMain.handle(IpcChannels.OVERLAY_SET_DRAG_MODE, (_, enabled: boolean) => {
    overlay.setDragMode(enabled)
    return overlay.getState()
  })

  ipcMain.handle(IpcChannels.OVERLAY_SET_CLICK_THROUGH, (_, enabled: boolean) => {
    overlay.setClickThrough(enabled)
    return overlay.getState()
  })

  // ---- Settings ----
  ipcMain.handle(IpcChannels.SETTINGS_GET, () => {
    return SettingsStore.getAll()
  })

  ipcMain.handle(IpcChannels.SETTINGS_UPDATE, (_, patch: Partial<OverlaySettings>) => {
    return SettingsStore.update(patch)
  })

  // ---- Song detection (Phase 3) ----
  ipcMain.handle(IpcChannels.SONG_REFRESH, async () => {
    return songOrchestrator.refresh()
  })

  // ---- Lyrics (Phase 2) ----
  ipcMain.handle(IpcChannels.LYRICS_RELOAD, async () => {
    return lyricsOrchestrator.reload()
  })
}
