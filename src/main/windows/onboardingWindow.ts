import { shell } from 'electron'
import type { OverlayWindowManager } from './overlayWindow'

export class OnboardingWindowManager {
  constructor(private overlay: OverlayWindowManager) {}

  async open(onComplete: () => void): Promise<void> {
    await this.overlay.showPanel('onboarding', onComplete)
  }

  complete(): void {
    this.overlay.closePanel()
  }

  close(): void {
    this.overlay.closePanel()
  }

  static openSystemSettings(pane: 'automation'): void {
    const urls: Record<string, string> = {
      automation: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation'
    }
    void shell.openExternal(urls[pane])
  }
}
