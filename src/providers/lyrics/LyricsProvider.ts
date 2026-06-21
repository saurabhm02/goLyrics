import type { NowPlayingTrack } from '../../shared/types/song'
import type { ParsedLyrics, LrcLine, LrcWord } from '../../shared/types/lyrics'

/**
 * Contract for lyrics providers (local file, remote APIs, etc.)
 */
export interface LyricsProvider {
  readonly id: string
  readonly name: string

  /** Attempt to find lyrics for the given track. Returns null on miss. */
  fetchLyrics(track: NowPlayingTrack): Promise<ParsedLyrics | null>
}

function parseTimestampToMs(minutes: string, seconds: string, fraction: string): number {
  const millis = fraction.length === 2 ? parseInt(fraction, 10) * 10 : parseInt(fraction, 10)
  return parseInt(minutes, 10) * 60_000 + parseInt(seconds, 10) * 1_000 + millis
}

function parseEnhancedWords(text: string): { words: LrcWord[]; plainText: string } | null {
  const wordPattern = /<(\d{1,2}):(\d{2})\.(\d{2,3})>([^<]+)/g
  const matches = [...text.matchAll(wordPattern)]
  if (!matches.length) return null

  const words: LrcWord[] = matches.map((match) => ({
    timeMs: parseTimestampToMs(match[1], match[2], match[3]),
    text: match[4].trim()
  }))

  const plainText = words.map((w) => w.text).join(' ')
  return { words, plainText: plainText || text.replace(wordPattern, '').trim() }
}

export function parseLrc(lrcText: string): ParsedLyrics {
  const lines: LrcLine[] = []

  for (const rawLine of lrcText.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const timestampMatches = [...line.matchAll(/\[(\d{1,2}):(\d{2})\.(\d{2,3})\]/g)]
    if (timestampMatches.length === 0) continue

    const textPart = line.replace(/\[(\d{1,2}):(\d{2})\.(\d{2,3})\]/g, '').trim()
    if (!textPart) continue

    for (const match of timestampMatches) {
      const timeMs = parseTimestampToMs(match[1], match[2], match[3])
      const enhanced = parseEnhancedWords(textPart)
      if (enhanced) {
        lines.push({ timeMs, text: enhanced.plainText, words: enhanced.words })
      } else {
        lines.push({ timeMs, text: textPart })
      }
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
