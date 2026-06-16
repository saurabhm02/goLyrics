import type { OverlaySettings } from '../types/settings'

export const DEFAULT_OVERLAY_WIDTH = 600
export const DEFAULT_OVERLAY_HEIGHT = 160
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
export const APP_NAME = 'LyricOverlay'
