import type { ParsedLyrics } from '../../shared/types/lyrics'
import type { NowPlayingTrack } from '../../shared/types/song'
import type { LyricsProvider } from '../../providers/lyrics/LyricsProvider'

/**
 * Fetches and caches lyrics for the current track.
 * Phase 2 adds LocalLrcProvider; Phase 4 adds remote providers.
 */
export class LyricsOrchestrator {
  private providers: LyricsProvider[] = []
  private cachedLyrics: ParsedLyrics | null = null
  private cachedTrackId: string | null = null

  register(...providers: LyricsProvider[]): void {
    this.providers.push(...providers)
  }

  async fetchForTrack(track: NowPlayingTrack): Promise<ParsedLyrics | null> {
    const trackId = `${track.artist}::${track.title}`
    if (trackId === this.cachedTrackId && this.cachedLyrics) {
      return this.cachedLyrics
    }

    for (const provider of this.providers) {
      const lyrics = await provider.fetchLyrics(track)
      if (lyrics) {
        this.cachedLyrics = lyrics
        this.cachedTrackId = trackId
        return lyrics
      }
    }

    return null
  }

  async reload(): Promise<boolean> {
    // Force cache bust on next fetch
    this.cachedTrackId = null
    this.cachedLyrics = null
    console.log('[LyricsOrchestrator] Cache cleared — lyrics will be re-fetched')
    return true
  }

  getCached(): ParsedLyrics | null {
    return this.cachedLyrics
  }
}
