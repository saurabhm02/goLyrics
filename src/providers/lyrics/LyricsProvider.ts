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

export function parseLrc(lrcText: string): ParsedLyrics {
  const lines: LrcLine[] = []

  for (const rawLine of lrcText.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const timestampMatches = [...line.matchAll(/\[(\d{1,2}):(\d{2})\.(\d{2,3})\]/g)]
    if (timestampMatches.length === 0) continue

    const text = line.replace(/\[(\d{1,2}):(\d{2})\.(\d{2,3})\]/g, '').trim()
    if (!text) continue

    for (const match of timestampMatches) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const fraction = match[3]
      const millis = fraction.length === 2 ? parseInt(fraction, 10) * 10 : parseInt(fraction, 10)
      const timeMs = minutes * 60_000 + seconds * 1_000 + millis
      lines.push({ timeMs, text })
    }
  }

  lines.sort((a, b) => a.timeMs - b.timeMs)
  return { lines }
}

export function plainLyricsToTimedLyrics(plainLyrics: string, durationMs?: number): ParsedLyrics {
  const rows = plainLyrics
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (!rows.length) return { lines: [] }

  const estimatedDuration = durationMs && durationMs > 0 ? durationMs : rows.length * 3000
  const step = Math.max(1000, Math.round(estimatedDuration / Math.max(rows.length, 1)))

  const lines: LrcLine[] = rows.map((text, idx) => ({
    timeMs: idx * step,
    text
  }))

  return { lines }
}
