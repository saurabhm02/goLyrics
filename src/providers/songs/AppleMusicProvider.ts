import type { SongProvider } from './SongProvider'
import type { NowPlayingTrack } from '../../shared/types/song'

/**
 * Phase 3: Reads Apple Music / iTunes via AppleScript.
 * (`osascript -e 'tell application "Music" to ...'`)
 *
 * Phase 1 stub: always reports unavailable.
 */
export class AppleMusicProvider implements SongProvider {
  readonly id = 'apple-music'
  readonly name = 'Apple Music'

  async isAvailable(): Promise<boolean> {
    return false
  }

  async getNowPlaying(): Promise<NowPlayingTrack | null> {
    return null
  }

  startPolling(_onChange: (track: NowPlayingTrack | null) => void): void {}

  stopPolling(): void {}
}
