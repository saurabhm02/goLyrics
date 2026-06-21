import type { OverlaySettings, YouTubeBrowser } from '../types/settings'

export const SONG_PROVIDER_IDS = {
  macOSNowPlaying: 'macos-now-playing',
  spotify: 'spotify',
  appleMusic: 'apple-music',
  chromeYouTube: 'chrome-youtube',
  arcYouTube: 'arc-youtube',
  edgeYouTube: 'edge-youtube',
  safariYouTube: 'safari-youtube'
} as const

export const ALL_SONG_PROVIDER_IDS: string[] = [
  SONG_PROVIDER_IDS.macOSNowPlaying,
  SONG_PROVIDER_IDS.spotify,
  SONG_PROVIDER_IDS.appleMusic,
  SONG_PROVIDER_IDS.chromeYouTube,
  SONG_PROVIDER_IDS.arcYouTube,
  SONG_PROVIDER_IDS.edgeYouTube,
  SONG_PROVIDER_IDS.safariYouTube
]

const YOUTUBE_BROWSER_PROVIDER_IDS: Record<Exclude<YouTubeBrowser, 'none' | 'all'>, string> = {
  chrome: SONG_PROVIDER_IDS.chromeYouTube,
  arc: SONG_PROVIDER_IDS.arcYouTube,
  edge: SONG_PROVIDER_IDS.edgeYouTube,
  safari: SONG_PROVIDER_IDS.safariYouTube
}

const ALL_YOUTUBE_BROWSER_PROVIDER_IDS = Object.values(YOUTUBE_BROWSER_PROVIDER_IDS)

export function resolveEnabledProviderIds(settings: OverlaySettings): string[] {
  const ids: string[] = []

  if (settings.enableMacOSNowPlaying) {
    ids.push(SONG_PROVIDER_IDS.macOSNowPlaying)
  }
  if (settings.enableSpotify) {
    ids.push(SONG_PROVIDER_IDS.spotify)
  }
  if (settings.enableAppleMusic) {
    ids.push(SONG_PROVIDER_IDS.appleMusic)
  }

  if (settings.youtubeBrowser === 'all') {
    ids.push(...ALL_YOUTUBE_BROWSER_PROVIDER_IDS)
  } else if (settings.youtubeBrowser !== 'none') {
    ids.push(YOUTUBE_BROWSER_PROVIDER_IDS[settings.youtubeBrowser])
  }

  return ids
}
