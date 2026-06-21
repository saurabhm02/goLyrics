import type { NowPlayingTrack } from '../../shared/types/song'
import type { ParsedLyrics } from '../../shared/types/lyrics'
import type { LyricsProvider } from './LyricsProvider'
import { parseLrc, plainLyricsToTimedLyrics } from './LyricsProvider'
import { artistMatches, buildArtistCandidates, durationMatches, extractArtistCandidatesFromTitle, titleMatches } from '../../shared/utils/lyricsMatch'
import { sessionLog } from '../../main/debug/sessionLog'

interface LrcLibResponse {
  syncedLyrics?: string | null
  plainLyrics?: string | null
  trackName?: string
  artistName?: string
  duration?: number
}

const DEVANAGARI_RE = /[\u0900-\u097F]/

const ROMANIZATION_MAP: Record<string, string> = {
  'ा': 'a', 'ी': 'i', 'ू': 'u', 'े': 'e', 'ो': 'o', 'ं': 'n', 'ः': 'h', '्': '',
  'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'च': 'cha', 'छ': 'chha', 'ज': 'ja',
  'झ': 'jha', 'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na', 'त': 'ta',
  'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na', 'प': 'pa', 'फ': 'pha', 'ब': 'ba',
  'भ': 'bha', 'म': 'ma', 'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha',
  'ष': 'sha', 'स': 'sa', 'ह': 'ha'
}

function romanizeDevanagari(text: string): string {
  let result = ''
  for (const char of text) {
    result += ROMANIZATION_MAP[char] ?? (/[a-zA-Z0-9\s]/.test(char) ? char : '')
  }
  return result.replace(/\s+/g, ' ').trim()
}

function cleanTrackTitle(rawTitle: string): string {
  const normalized = rawTitle
    .replace(/\(.*?official.*?\)/gi, '')
    .replace(/\[.*?official.*?\]/gi, '')
    .replace(/\(.*?lyrics?.*?\)/gi, '')
    .replace(/\[.*?lyrics?.*?\]/gi, '')
    .replace(/\(.*?video.*?\)/gi, '')
    .replace(/\[.*?video.*?\]/gi, '')
    .replace(/\(.*?live.*?\)/gi, '')
    .replace(/\[.*?live.*?\]/gi, '')
    .replace(/\(.*?remix.*?\)/gi, '')
    .replace(/\[.*?remix.*?\]/gi, '')
    .replace(/\(.*?acoustic.*?\)/gi, '')
    .replace(/\[.*?acoustic.*?\]/gi, '')
    .replace(/\b(4k|8k|hd|hq)\b/gi, '')
    .replace(/\bft\.?\s+[^()[\]]+/gi, '')
    .replace(/\bfeat\.?\s+[^()[\]]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized.split('|')[0]?.trim() ?? normalized
}

function buildTitleCandidates(rawTitle: string): string[] {
  const cleaned = cleanTrackTitle(rawTitle)
  const candidates = new Set<string>()
  if (cleaned) candidates.add(cleaned)

  if (DEVANAGARI_RE.test(cleaned)) {
    const romanized = romanizeDevanagari(cleaned)
    if (romanized) candidates.add(romanized)
  }

  for (const sep of [' - ', ' – ', ' — ', ': ']) {
    if (cleaned.includes(sep)) {
      const [first, second] = cleaned.split(sep).map((s) => s.trim())
      if (first) candidates.add(first)
      if (second) candidates.add(second)
      if (first && DEVANAGARI_RE.test(first)) {
        const roman = romanizeDevanagari(first)
        if (roman) candidates.add(roman)
      }
    }
  }
  return [...candidates].filter(Boolean)
}

function validateLrcLibMatch(
  data: LrcLibResponse,
  searchTrackName: string,
  originalTitle: string,
  searchArtist: string,
  durationMs?: number
): boolean {
  const returnedTitle = data.trackName?.trim()
  if (!returnedTitle) return false
  if (
    !titleMatches(searchTrackName, returnedTitle) &&
    !titleMatches(originalTitle, returnedTitle)
  ) {
    return false
  }
  if (searchArtist && !artistMatches(searchArtist, data.artistName)) {
    return false
  }
  return durationMatches(data.duration, durationMs)
}

function toParsedLyrics(
  data: LrcLibResponse,
  fallbackDurationMs?: number,
  providerId?: string
): ParsedLyrics | null {
  const synced = data.syncedLyrics?.trim()
  if (synced) {
    const parsed = parseLrc(synced)
    if (parsed.lines.length > 0) {
      if (data.trackName && providerId) {
        parsed.matchMeta = {
          matchedTrackName: data.trackName,
          matchedArtistName: data.artistName,
          providerId
        }
      }
      return parsed
    }
  }

  const plain = data.plainLyrics?.trim()
  if (plain) {
    const parsed = plainLyricsToTimedLyrics(plain, fallbackDurationMs)
    if (parsed.lines.length > 0) {
      if (data.trackName && providerId) {
        parsed.matchMeta = {
          matchedTrackName: data.trackName,
          matchedArtistName: data.artistName,
          providerId
        }
      }
      return parsed
    }
  }
  return null
}

function durationScore(candidate: LrcLibResponse, targetDurationMs?: number): number {
  if (!targetDurationMs || !candidate.duration) return 0
  const candidateMs = Math.round(candidate.duration * 1000)
  return Math.abs(candidateMs - targetDurationMs)
}

function rankResults(results: LrcLibResponse[], targetDurationMs?: number): LrcLibResponse[] {
  return [...results].sort((a, b) => durationScore(a, targetDurationMs) - durationScore(b, targetDurationMs))
}

export class LrcLibLyricsProvider implements LyricsProvider {
  readonly id = 'lrclib'
  readonly name = 'LRCLIB'

  async fetchLyrics(track: NowPlayingTrack): Promise<ParsedLyrics | null> {
    const titleCandidates = buildTitleCandidates(track.title)
    if (!titleCandidates.length) return null

    const artistCandidates = [
      ...extractArtistCandidatesFromTitle(track.title),
      ...buildArtistCandidates(track.artist)
    ]
    if (DEVANAGARI_RE.test(track.artist)) {
      const roman = romanizeDevanagari(track.artist)
      if (roman) artistCandidates.push(roman)
    }
    const artistList = [...new Set(artistCandidates.filter(Boolean))]
    const searchArtists = artistList.length > 0 ? [...artistList, ''] : ['']

    // #region agent log
    sessionLog(
      'LrcLibLyricsProvider.ts:fetchLyrics',
      'searching lrclib',
      {
        title: track.title,
        artist: track.artist,
        artistCandidates,
        titleCandidates
      },
      'H6'
    )
    // #endregion

    for (const artist of searchArtists) {
      for (const trackName of titleCandidates) {
        const parsed = await this.tryGetEndpoint(trackName, artist, track.durationMs, track.title)
        if (parsed) {
          // #region agent log
          sessionLog(
            'LrcLibLyricsProvider.ts:fetchLyrics',
            'lrclib match accepted',
            {
              searchArtist: artist,
              searchTrackName: trackName,
              matchedArtist: parsed.matchMeta?.matchedArtistName ?? null,
              matchedTrack: parsed.matchMeta?.matchedTrackName ?? null,
              firstLine: parsed.lines[0]?.text?.slice(0, 60) ?? null
            },
            'H6'
          )
          // #endregion
          return parsed
        }
      }
    }

    for (const artist of searchArtists) {
      for (const trackName of titleCandidates) {
        const parsed = await this.trySearchEndpoint(trackName, artist, track.durationMs, track.title)
        if (parsed) {
          // #region agent log
          sessionLog(
            'LrcLibLyricsProvider.ts:fetchLyrics',
            'lrclib search match accepted',
            {
              searchArtist: artist,
              searchTrackName: trackName,
              matchedArtist: parsed.matchMeta?.matchedArtistName ?? null,
              matchedTrack: parsed.matchMeta?.matchedTrackName ?? null,
              firstLine: parsed.lines[0]?.text?.slice(0, 60) ?? null
            },
            'H6'
          )
          // #endregion
          return parsed
        }
      }
    }

    return null
  }

  private async tryGetEndpoint(
    trackName: string,
    artist: string,
    durationMs?: number,
    originalTitle?: string
  ): Promise<ParsedLyrics | null> {
    try {
      const getUrl = new URL('https://lrclib.net/api/get')
      getUrl.searchParams.set('track_name', trackName)
      if (artist) getUrl.searchParams.set('artist_name', artist)

      const response = await fetch(getUrl.toString(), {
        headers: { Accept: 'application/json', 'User-Agent': 'goLyrics/0.2.0' }
      })
      if (!response.ok) return null

      const data = (await response.json()) as LrcLibResponse
      if (!validateLrcLibMatch(data, trackName, originalTitle ?? trackName, artist, durationMs)) {
        return null
      }
      return toParsedLyrics(data, durationMs, this.id)
    } catch {
      return null
    }
  }

  private async trySearchEndpoint(
    trackName: string,
    artist: string,
    durationMs?: number,
    originalTitle?: string
  ): Promise<ParsedLyrics | null> {
    try {
      const searchUrl = new URL('https://lrclib.net/api/search')
      searchUrl.searchParams.set('track_name', trackName)
      if (artist) searchUrl.searchParams.set('artist_name', artist)

      const response = await fetch(searchUrl.toString(), {
        headers: { Accept: 'application/json', 'User-Agent': 'goLyrics/0.2.0' }
      })
      if (!response.ok) return null

      const results = (await response.json()) as LrcLibResponse[]
      if (!Array.isArray(results) || results.length === 0) return null

      for (const candidate of rankResults(results, durationMs).slice(0, 5)) {
        if (!validateLrcLibMatch(candidate, trackName, originalTitle ?? trackName, artist, durationMs)) {
          continue
        }
        const parsed = toParsedLyrics(candidate, durationMs, this.id)
        if (parsed) return parsed
      }
    } catch {
      return null
    }

    return null
  }
}
