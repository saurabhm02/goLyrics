import type { OverlayState, OverlaySettings, OverlayPanelMode } from './settings'
import type { NowPlayingTrack } from './song'
import type { ActiveLines } from './lyrics'

type Unsubscribe = () => void

/**
 * The bridge API exposed on window.goLyrics by the preload script.
 * Defined here (shared) so the renderer can import the type without
 * pulling in Electron-specific modules.
 */
export interface goLyricsAPI {
  // Overlay control
  toggleOverlay: () => Promise<OverlayState>
  getOverlayState: () => Promise<OverlayState>
  setDragMode: (enabled: boolean) => Promise<OverlayState>
  setClickThrough: (enabled: boolean) => Promise<OverlayState>
  onOverlayStateChanged: (cb: (state: OverlayState) => void) => Unsubscribe
  getPanelMode: () => Promise<OverlayPanelMode>
  closePanel: () => Promise<OverlayPanelMode>
  onPanelModeChanged: (cb: (mode: OverlayPanelMode) => void) => Unsubscribe

  // Settings
  getSettings: () => Promise<OverlaySettings>
  updateSettings: (patch: Partial<OverlaySettings>) => Promise<OverlaySettings>
  openSettings: () => Promise<void>
  resetOverlayPosition: () => Promise<void>
  clearLyricsCache: () => Promise<number>
  onSettingsChanged: (cb: (settings: OverlaySettings) => void) => Unsubscribe

  // Onboarding
  completeOnboarding: () => Promise<void>
  openSystemSettings: (pane: 'automation') => Promise<void>

  // Song detection (Phase 3)
  refreshSong: () => Promise<NowPlayingTrack | null>
  onTrackChanged: (cb: (track: NowPlayingTrack | null) => void) => Unsubscribe

  // Lyrics (Phase 2)
  reloadLyrics: () => Promise<boolean>
  onLyricsChanged: (cb: (lines: ActiveLines) => void) => Unsubscribe
}
