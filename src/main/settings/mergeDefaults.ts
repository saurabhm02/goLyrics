import type { OverlaySettings } from '../../shared/types/settings'
import { DEFAULT_OVERLAY_SETTINGS } from '../../shared/constants/defaults'

export function mergeWithDefaults(stored: Partial<OverlaySettings>): OverlaySettings {
  const merged = { ...DEFAULT_OVERLAY_SETTINGS, ...stored }

  if (stored.songSourcesVersion === undefined) {
    return {
      ...merged,
      enableMacOSNowPlaying: true,
      enableSpotify: true,
      enableAppleMusic: true,
      youtubeBrowser: 'all',
      songSourcesVersion: 1
    }
  }

  return merged
}
