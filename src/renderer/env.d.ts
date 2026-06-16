/// <reference types="vite/client" />

import type { goLyricsAPI } from '../shared/types/api'

declare global {
  interface Window {
    goLyrics: goLyricsAPI
  }
}
