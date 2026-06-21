import { app, BrowserWindow } from 'electron'
import type { OverlaySettings } from '../../shared/types/settings'
import { IpcChannels } from '../../shared/types/ipc'
import { SettingsStore } from './settingsStore'
import type { OverlayWindowManager } from '../windows/overlayWindow'

export class SettingsService {
  private settings: OverlaySettings
  private changeListener: ((settings: OverlaySettings) => void) | null = null

  constructor(
    private overlay: OverlayWindowManager,
    initial?: OverlaySettings
  ) {
    this.settings = initial ?? SettingsStore.load()
    this.applyLaunchAtLogin(this.settings.launchAtLogin)
  }

  onChange(listener: (settings: OverlaySettings) => void): void {
    this.changeListener = listener
  }

  getAll(): OverlaySettings {
    return { ...this.settings }
  }

  update(patch: Partial<OverlaySettings>): OverlaySettings {
    const next = SettingsStore.update(patch)
    this.settings = next
    this.applyPatch(patch)
    this.broadcast()
    this.changeListener?.(next)
    return next
  }

  private applyPatch(patch: Partial<OverlaySettings>): void {
    if (patch.opacity !== undefined) {
      this.overlay.setOpacity(patch.opacity)
    }
    if (patch.showInDock !== undefined && process.platform === 'darwin') {
      if (patch.showInDock) app.dock.show()
      else app.dock.hide()
    }
    if (patch.launchAtLogin !== undefined) {
      this.applyLaunchAtLogin(patch.launchAtLogin)
    }
    if (patch.dualLineMode !== undefined) {
      this.overlay.setDualLineMode(patch.dualLineMode)
    }
    if (patch.safeAreaProfile !== undefined) {
      this.overlay.setSafeAreaProfile(patch.safeAreaProfile)
    }
    if (
      patch.fontSizePx !== undefined ||
      patch.fontPreset !== undefined ||
      patch.lyricLeadMs !== undefined ||
      patch.onboardingComplete !== undefined
    ) {
      this.overlay.broadcastState()
    }
  }

  private applyLaunchAtLogin(enabled: boolean): void {
    if (process.platform !== 'darwin') return
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true
    })
  }

  private broadcast(): void {
    const payload = this.getAll()
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IpcChannels.SETTINGS_CHANGED, payload)
      }
    }
  }

  broadcastCurrent(): void {
    this.broadcast()
  }
}
