import type { OverlaySettings, SafeAreaProfile } from '../types/settings'

/** Fallback width only; runtime uses full display work-area width for true centering */
export const DEFAULT_OVERLAY_WIDTH = 720
export const DEFAULT_OVERLAY_HEIGHT = 56
/** Gap between overlay bottom edge and display work area bottom (fullscreen profile) */
export const DEFAULT_OVERLAY_BOTTOM_GAP = 10

export const SAFE_AREA_BOTTOM_GAPS: Record<SafeAreaProfile, number> = {
  dock: 48,
  fullscreen: 10,
  notch: 72
}

export const DEFAULT_OVERLAY_HEIGHT_DUAL_LINE = 96

export function getOverlayWidthForDisplay(workAreaWidth: number): number {
  return workAreaWidth
}

export const DEFAULT_OVERLAY_OPACITY = 0.92
export const DEFAULT_LYRIC_LEAD_MS = 1000
export const DEFAULT_FONT_SIZE_PX = 34
export const SYNC_OFFSET_STEP_MS = 500
export const LYRICS_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const LYRICS_NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000

// Default position is set at runtime to bottom-center of primary display.
// These values serve as an absolute fallback only.
export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  x: 0,
  y: 0,
  width: DEFAULT_OVERLAY_WIDTH,
  height: DEFAULT_OVERLAY_HEIGHT,
  visible: true,
  clickThrough: true,
  dragMode: false,
  showInDock: true,
  opacity: DEFAULT_OVERLAY_OPACITY,
  lyricLeadMs: DEFAULT_LYRIC_LEAD_MS,
  fontSizePx: DEFAULT_FONT_SIZE_PX,
  fontPreset: 'classic',
  dualLineMode: false,
  safeAreaProfile: 'dock',
  launchAtLogin: false,
  onboardingComplete: false,
  songSourcesVersion: 1,
  enableMacOSNowPlaying: true,
  enableSpotify: false,
  enableAppleMusic: false,
  youtubeBrowser: 'chrome',
  useCustomPosition: false,
  lyricsScriptMode: 'romanized'
}

export const SETTINGS_FILE_NAME = 'config'
export const APP_NAME = 'goLyrics'
export const APP_LOGO_URL = 'https://kafan.s3.ap-south-1.amazonaws.com/golyrics.png'
