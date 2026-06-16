import type { SongProvider } from './SongProvider'
import type { NowPlayingTrack } from '../../shared/types/song'

/**
 * Phase 3: Scrapes the YouTube tab title from Chrome via AppleScript.
 * (`osascript -e 'tell app "Google Chrome" to get title of active tab...'`)
 * Parses "Artist - Title - YouTube" format from the window title.
 *
 * Phase 1 stub: always reports unavailable.
 */
export class ChromeYouTubeProvider implements SongProvider {
  readonly id = 'chrome-youtube'
  readonly name = 'Chrome / YouTube'

  async isAvailable(): Promise<boolean> {
    return false
  }

  async getNowPlaying(): Promise<NowPlayingTrack | null> {
    return null
  }

  startPolling(_onChange: (track: NowPlayingTrack | null) => void): void {}

  stopPolling(): void {}
}
