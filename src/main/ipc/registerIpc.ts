import { ipcMain } from 'electron'
import { IpcChannels } from './channels'
import type { OverlayWindowManager } from '../windows/overlayWindow'
import { OnboardingWindowManager } from '../windows/onboardingWindow'
import type { SongOrchestrator } from '../services/songOrchestrator'
import type { LyricsOrchestrator } from '../services/lyricsOrchestrator'
import type { SettingsService } from '../settings/settingsService'
import type { OverlaySettings } from '../../shared/types/settings'
import { toggleOverlayWithDismiss } from '../services/overlayVisibility'

export function registerIpc(
  overlay: OverlayWindowManager,
  settingsService: SettingsService,
  songOrchestrator: SongOrchestrator,
  lyricsOrchestrator: LyricsOrchestrator
): void {
  ipcMain.handle(IpcChannels.OVERLAY_TOGGLE, () => {
    toggleOverlayWithDismiss()
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

  ipcMain.handle(IpcChannels.OVERLAY_CLOSE_PANEL, () => {
    overlay.closePanel()
    return overlay.getPanelMode()
  })

  ipcMain.handle(IpcChannels.OVERLAY_GET_PANEL_MODE, () => {
    return overlay.getPanelMode()
  })

  ipcMain.handle(IpcChannels.SETTINGS_GET, () => {
    return settingsService.getAll()
  })

  ipcMain.handle(IpcChannels.SETTINGS_UPDATE, (_, patch: Partial<OverlaySettings>) => {
    return settingsService.update(patch)
  })

  ipcMain.handle(IpcChannels.SETTINGS_OPEN, async () => {
    await overlay.showPanel('settings')
  })

  ipcMain.handle(IpcChannels.SETTINGS_RESET_POSITION, () => {
    overlay.resetPosition()
  })

  ipcMain.handle(IpcChannels.CACHE_CLEAR_LYRICS, () => {
    return lyricsOrchestrator.clearAllCache()
  })

  ipcMain.handle(IpcChannels.ONBOARDING_COMPLETE, () => {
    settingsService.update({ onboardingComplete: true })
    overlay.closePanel()
  })

  ipcMain.handle(IpcChannels.ONBOARDING_OPEN_SYSTEM_SETTINGS, () => {
    OnboardingWindowManager.openSystemSettings('automation')
  })

  ipcMain.handle(IpcChannels.SONG_REFRESH, async () => {
    return songOrchestrator.refresh()
  })

  ipcMain.handle(IpcChannels.LYRICS_RELOAD, async () => {
    return lyricsOrchestrator.reload()
  })
}
