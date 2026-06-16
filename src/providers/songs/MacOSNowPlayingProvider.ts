import type { SongProvider } from './SongProvider'
import type { NowPlayingTrack } from '../../shared/types/song'

/**
 * Phase 3: Uses macOS MediaRemote private framework (via native addon or
 * AppleScript) to read the system Now Playing state. Works with any app
 * that registers as a Now Playing source (Spotify, Apple Music, Chrome, etc.)
 *
 * Phase 1 stub: always reports unavailable.
 */
export class MacOSNowPlayingProvider implements SongProvider {
  readonly id = 'macos-now-playing'
  readonly name = 'macOS Now Playing'

  async isAvailable(): Promise<boolean> {
    // Phase 3: check process.platform === 'darwin' and native module availability
    return false
  }

  async getNowPlaying(): Promise<NowPlayingTrack | null> {
    return null
  }

  startPolling(_onChange: (track: NowPlayingTrack | null) => void): void {
    // Phase 3: poll at 1s interval via native MediaRemote
  }

  stopPolling(): void {}
}
