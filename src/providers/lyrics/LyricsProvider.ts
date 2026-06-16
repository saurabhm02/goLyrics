import type { NowPlayingTrack } from '../../shared/types/song'
import type { ParsedLyrics, LrcLine } from '../../shared/types/lyrics'

/**
 * Contract for lyrics providers (local file, remote APIs, etc.)
 */
export interface LyricsProvider {
  readonly id: string
  readonly name: string

  /** Attempt to find lyrics for the given track. Returns null on miss. */
  fetchLyrics(track: NowPlayingTrack): Promise<ParsedLyrics | null>
}

/**
 * Parses an LRC-formatted string into timestamped lines.
 *
 * Supports standard LRC format:
 *   [mm:ss.xx] lyric text
 *   [mm:ss.xxx] lyric text (milliseconds)
 *
 * Shared utility — used by both local and remote providers.
 */
export function parseLrc(lrcText: string): ParsedLyrics {
  const lines: LrcLine[] = []

  for (const rawLine of lrcText.split('\n')) {
    const line = rawLine.trim()
    // Match [mm:ss.xx] or [mm:ss.xxx] timestamp tags
    const match = line.match(/^\[(\d{1,2}):(\d{2})\.(\d{2,3})\](.*)$/)
    if (!match) continue

    const minutes = parseInt(match[1], 10)
    const seconds = parseInt(match[2], 10)
    const centis = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10)
    const timeMs = minutes * 60_000 + seconds * 1_000 + centis
    const text = match[4].trim()

    lines.push({ timeMs, text })
  }

  lines.sort((a, b) => a.timeMs - b.timeMs)
  return { lines }
}
