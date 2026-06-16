/// <reference types="vite/client" />

import type { LyricOverlayAPI } from '../shared/types/api'

declare global {
  interface Window {
    lyricOverlay: LyricOverlayAPI
  }
}
