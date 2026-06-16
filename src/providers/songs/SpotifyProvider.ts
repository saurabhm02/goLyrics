import type { SongProvider } from './SongProvider'
import type { NowPlayingTrack } from '../../shared/types/song'

/**
 * Phase 3: Reads Spotify's current track via AppleScript on macOS
 * (`osascript -e 'tell application "Spotify" to ...'`).
 * Falls back to Spotify Web API with OAuth if AppleScript is unavailable.
 *
 * Phase 1 stub: always reports unavailable.
 */
export class SpotifyProvider implements SongProvider {
  readonly id = 'spotify'
  readonly name = 'Spotify'

  async isAvailable(): Promise<boolean> {
    return false
  }

  async getNowPlaying(): Promise<NowPlayingTrack | null> {
    return null
  }

  startPolling(_onChange: (track: NowPlayingTrack | null) => void): void {}

  stopPolling(): void {}
}
