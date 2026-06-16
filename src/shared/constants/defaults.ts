import type { OverlaySettings } from '../types/settings'

/** Fallback width only; runtime uses full display work-area width for true centering */
export const DEFAULT_OVERLAY_WIDTH = 720
export const DEFAULT_OVERLAY_HEIGHT = 56
/** Gap between overlay bottom edge and display work area bottom */
export const DEFAULT_OVERLAY_BOTTOM_GAP = 10

export function getOverlayWidthForDisplay(workAreaWidth: number): number {
  return workAreaWidth
}
export const DEFAULT_OVERLAY_OPACITY = 0.92

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
  opacity: DEFAULT_OVERLAY_OPACITY
}

export const SETTINGS_FILE_NAME = 'config'
export const APP_NAME = 'goLyrics'
export const APP_LOGO_URL = 'https://kafan.s3.ap-south-1.amazonaws.com/golyrics.png'
