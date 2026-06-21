import type { OverlayWindowManager } from './overlayWindow'

export class SettingsWindowManager {
  constructor(private overlay: OverlayWindowManager) {}

  async open(): Promise<void> {
    await this.overlay.showPanel('settings')
  }

  close(): void {
    this.overlay.closePanel()
  }
}
