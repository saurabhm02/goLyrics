import type { SongProvider } from './SongProvider'
import { MacOSNowPlayingProvider } from './MacOSNowPlayingProvider'
import { SpotifyProvider } from './SpotifyProvider'
import { AppleMusicProvider } from './AppleMusicProvider'
import {
  BrowserYouTubeProvider,
  CHROME_YOUTUBE_CONFIG,
  ARC_YOUTUBE_CONFIG,
  EDGE_YOUTUBE_CONFIG,
  SAFARI_YOUTUBE_CONFIG
} from './BrowserYouTubeProvider'
import { SONG_PROVIDER_IDS } from '../../shared/constants/songSources'

export { SongProvider }
export { MacOSNowPlayingProvider }
export { SpotifyProvider }
export { AppleMusicProvider }
export { BrowserYouTubeProvider }

export { SONG_PROVIDER_IDS }

/**
 * Returns all song providers in priority order.
 */
export function buildSongProviderRegistry(): SongProvider[] {
  return [
    new MacOSNowPlayingProvider(),
    new SpotifyProvider(),
    new AppleMusicProvider(),
    new BrowserYouTubeProvider(CHROME_YOUTUBE_CONFIG),
    new BrowserYouTubeProvider(ARC_YOUTUBE_CONFIG),
    new BrowserYouTubeProvider(EDGE_YOUTUBE_CONFIG),
    new BrowserYouTubeProvider(SAFARI_YOUTUBE_CONFIG)
  ]
}
