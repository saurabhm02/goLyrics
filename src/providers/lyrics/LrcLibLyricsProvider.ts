import type { NowPlayingTrack } from '../../shared/types/song'
import type { ParsedLyrics } from '../../shared/types/lyrics'
import type { LyricsProvider } from './LyricsProvider'
import { parseLrc, plainLyricsToTimedLyrics } from './LyricsProvider'

interface LrcLibResponse {
  syncedLyrics?: string | null
  plainLyrics?: string | null
  trackName?: string
  artistName?: string
  duration?: number
}

function cleanTrackTitle(rawTitle: string): string {
  const normalized = rawTitle
    .replace(/\(.*?official.*?\)/gi, '')
    .replace(/\[.*?official.*?\]/gi, '')
    .replace(/\(.*?lyrics?.*?\)/gi, '')
    .replace(/\[.*?lyrics?.*?\]/gi, '')
    .replace(/\(.*?video.*?\)/gi, '')
    .replace(/\[.*?video.*?\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // YouTube titles often include metadata chunks after separators.
  return normalized.split('|')[0]?.trim() ?? normalized
}

function buildTitleCandidates(rawTitle: string): string[] {
  const cleaned = cleanTrackTitle(rawTitle)
  const candidates = new Set<string>()
  if (cleaned) candidates.add(cleaned)

  for (const sep of [' - ', ' – ', ' — ', ': ']) {
    if (cleaned.includes(sep)) {
      const [first, second] = cleaned.split(sep).map((s) => s.trim())
      if (first) candidates.add(first)
      if (second) candidates.add(second)
    }
  }
  return [...candidates].filter(Boolean)
}

function toParsedLyrics(data: LrcLibResponse, fallbackDurationMs?: number): ParsedLyrics | null {
  const synced = data.syncedLyrics?.trim()
  if (synced) {
    const parsed = parseLrc(synced)
    if (parsed.lines.length > 0) return parsed
  }

  const plain = data.plainLyrics?.trim()
  if (plain) {
    const parsed = plainLyricsToTimedLyrics(plain, fallbackDurationMs)
    if (parsed.lines.length > 0) return parsed
  }
  return null
}

export class LrcLibLyricsProvider implements LyricsProvider {
  readonly id = 'lrclib'
  readonly name = 'LRCLIB'

  async fetchLyrics(track: NowPlayingTrack): Promise<ParsedLyrics | null> {
    const titleCandidates = buildTitleCandidates(track.title)
    if (!titleCandidates.length) return null
    const artist = track.artist && track.artist !== 'YouTube' ? track.artist : ''

    // 1) strict endpoint first for best-quality exact match
    try {
      for (const trackName of titleCandidates) {
        const getUrl = new URL('https://lrclib.net/api/get')
        getUrl.searchParams.set('track_name', trackName)
        if (artist) getUrl.searchParams.set('artist_name', artist)

        const response = await fetch(getUrl.toString(), {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'goLyrics/0.1.0'
          }
        })
        if (!response.ok) continue

        const data = (await response.json()) as LrcLibResponse
        const parsed = toParsedLyrics(data, track.durationMs)
        if (parsed) return parsed
      }
    } catch {
      // ignore and continue to search fallback
    }

    // 2) fuzzy search fallback (works when title format is noisy)
    try {
      for (const trackName of titleCandidates) {
        const searchUrl = new URL('https://lrclib.net/api/search')
        searchUrl.searchParams.set('track_name', trackName)
        if (artist) searchUrl.searchParams.set('artist_name', artist)

        const response = await fetch(searchUrl.toString(), {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'goLyrics/0.1.0'
          }
        })
        if (!response.ok) continue

        const results = (await response.json()) as LrcLibResponse[]
        if (!Array.isArray(results) || results.length === 0) continue

        for (const candidate of results.slice(0, 3)) {
          const parsed = toParsedLyrics(candidate, track.durationMs)
          if (parsed) return parsed
        }
      }
    } catch {
      return null
    }

    return null
  }
}
