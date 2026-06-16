import type { SongProvider } from './SongProvider'
import { MacOSNowPlayingProvider } from './MacOSNowPlayingProvider'
import { SpotifyProvider } from './SpotifyProvider'
import { AppleMusicProvider } from './AppleMusicProvider'
import { ChromeYouTubeProvider } from './ChromeYouTubeProvider'

export { SongProvider }
export { MacOSNowPlayingProvider }
export { SpotifyProvider }
export { AppleMusicProvider }
export { ChromeYouTubeProvider }

/**
 * Returns all song providers in priority order.
 * Phase 3: real implementations replace stubs.
 */
export function buildSongProviderRegistry(): SongProvider[] {
  return [
    new MacOSNowPlayingProvider(),
    new SpotifyProvider(),
    new AppleMusicProvider(),
    new ChromeYouTubeProvider()
  ]
}
