import type { OverlayState, OverlaySettings } from './settings'
import type { NowPlayingTrack } from './song'
import type { ActiveLines } from './lyrics'

type Unsubscribe = () => void

/**
 * The bridge API exposed on window.lyricOverlay by the preload script.
 * Defined here (shared) so the renderer can import the type without
 * pulling in Electron-specific modules.
 */
export interface LyricOverlayAPI {
  // Overlay control
  toggleOverlay: () => Promise<OverlayState>
  getOverlayState: () => Promise<OverlayState>
  setDragMode: (enabled: boolean) => Promise<OverlayState>
  setClickThrough: (enabled: boolean) => Promise<OverlayState>
  onOverlayStateChanged: (cb: (state: OverlayState) => void) => Unsubscribe

  // Settings
  getSettings: () => Promise<OverlaySettings>
  updateSettings: (patch: Partial<OverlaySettings>) => Promise<OverlaySettings>

  // Song detection (Phase 3)
  refreshSong: () => Promise<NowPlayingTrack | null>
  onTrackChanged: (cb: (track: NowPlayingTrack | null) => void) => Unsubscribe

  // Lyrics (Phase 2)
  reloadLyrics: () => Promise<boolean>
  onLyricsChanged: (cb: (lines: ActiveLines) => void) => Unsubscribe
}
