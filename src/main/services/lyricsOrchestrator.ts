import type { ParsedLyrics } from '../../shared/types/lyrics'
import type { NowPlayingTrack } from '../../shared/types/song'
import type { LyricsProvider } from '../../providers/lyrics/LyricsProvider'
import { buildLyricsCacheKey } from '../../shared/utils/trackKey'
import { artistMatches, titleMatches } from '../../shared/utils/lyricsMatch'
import {
  LYRICS_CACHE_TTL_MS,
  LYRICS_NEGATIVE_CACHE_TTL_MS
} from '../../shared/constants/defaults'
import { LyricsCacheStore, type CachedLyricsEntry } from '../cache/lyricsCacheStore'
import { sessionLog } from '../debug/sessionLog'

function cacheEntryMatchesTrack(entry: CachedLyricsEntry, track: NowPlayingTrack): boolean {
  if (entry.negative) return true

  // Legacy entries without metadata may contain wrong LRCLIB matches.
  if (!entry.sourceTitle && !entry.matchedTrackName) return false

  if (entry.sourceTitle && !titleMatches(track.title, entry.sourceTitle)) return false
  if (entry.matchedTrackName && !titleMatches(track.title, entry.matchedTrackName)) return false

  if (track.artist && track.artist !== 'YouTube') {
    if (!entry.matchedArtistName) return false
    if (!artistMatches(track.artist, entry.matchedArtistName)) return false
  }

  return true
}

/**
 * Fetches and caches lyrics for the current track.
 */
export class LyricsOrchestrator {
  private providers: LyricsProvider[] = []
  private cachedLyrics: ParsedLyrics | null = null
  private cachedTrackId: string | null = null
  private currentTrack: NowPlayingTrack | null = null

  register(...providers: LyricsProvider[]): void {
    this.providers.push(...providers)
  }

  setCurrentTrack(track: NowPlayingTrack | null): void {
    this.currentTrack = track
  }

  async fetchForTrack(track: NowPlayingTrack): Promise<ParsedLyrics | null> {
    const trackId = buildLyricsCacheKey(track)
    if (trackId === this.cachedTrackId && this.cachedLyrics) {
      // #region agent log
      sessionLog(
        'lyricsOrchestrator.ts:fetchForTrack',
        'memory cache hit',
        {
          trackId,
          title: track.title,
          lineCount: this.cachedLyrics.lines.length,
          firstLine: this.cachedLyrics.lines[0]?.text?.slice(0, 60) ?? null
        },
        'H4'
      )
      // #endregion
      return this.cachedLyrics
    }

    const diskEntry = LyricsCacheStore.get(trackId)
    if (diskEntry && !diskEntry.negative) {
      if (!cacheEntryMatchesTrack(diskEntry, track)) {
        // #region agent log
        sessionLog(
          'lyricsOrchestrator.ts:fetchForTrack',
          'disk cache rejected - title mismatch',
          {
            trackId,
            title: track.title,
            cachedSourceTitle: diskEntry.sourceTitle ?? null,
            cachedMatchedTrackName: diskEntry.matchedTrackName ?? null,
            firstLine: diskEntry.lyrics.lines[0]?.text?.slice(0, 60) ?? null
          },
          'H4'
        )
        // #endregion
        LyricsCacheStore.delete(trackId)
      } else {
        // #region agent log
        sessionLog(
          'lyricsOrchestrator.ts:fetchForTrack',
          'disk cache hit',
          {
            trackId,
            title: track.title,
            lineCount: diskEntry.lyrics.lines.length,
            firstLine: diskEntry.lyrics.lines[0]?.text?.slice(0, 60) ?? null
          },
          'H4'
        )
        // #endregion
        this.cachedLyrics = diskEntry.lyrics
        this.cachedTrackId = trackId
        return diskEntry.lyrics
      }
    }
    if (diskEntry?.negative) {
      // #region agent log
      sessionLog(
        'lyricsOrchestrator.ts:fetchForTrack',
        'negative cache hit - skipping fetch',
        { trackId, title: track.title },
        'H9'
      )
      // #endregion
      return null
    }

    for (const provider of this.providers) {
      const lyrics = await provider.fetchLyrics(track)
      if (lyrics) {
        this.cachedLyrics = lyrics
        this.cachedTrackId = trackId
        LyricsCacheStore.set({
          key: trackId,
          providerId: provider.id,
          lyrics,
          fetchedAt: Date.now(),
          expiresAt: Date.now() + LYRICS_CACHE_TTL_MS,
          sourceTitle: track.title,
          sourceArtist: track.artist,
          matchedTrackName: lyrics.matchMeta?.matchedTrackName,
          matchedArtistName: lyrics.matchMeta?.matchedArtistName
        })
        return lyrics
      }
    }

    LyricsCacheStore.set({
      key: trackId,
      providerId: 'none',
      lyrics: { lines: [] },
      fetchedAt: Date.now(),
      expiresAt: Date.now() + LYRICS_NEGATIVE_CACHE_TTL_MS,
      negative: true
    })

    return null
  }

  async reload(): Promise<boolean> {
    if (this.currentTrack) {
      const key = buildLyricsCacheKey(this.currentTrack)
      LyricsCacheStore.delete(key)
    }
    this.cachedTrackId = null
    this.cachedLyrics = null
    console.log('[LyricsOrchestrator] Cache cleared — lyrics will be re-fetched')
    return true
  }

  clearAllCache(): number {
    const size = LyricsCacheStore.size()
    LyricsCacheStore.clear()
    this.cachedTrackId = null
    this.cachedLyrics = null
    return size
  }

  invalidateMemoryCache(): void {
    this.cachedTrackId = null
    this.cachedLyrics = null
  }

  getCached(): ParsedLyrics | null {
    return this.cachedLyrics
  }
}
