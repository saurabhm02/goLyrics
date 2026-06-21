import type { ParsedLyrics, ActiveLines, LrcLine, LrcWord } from '../shared/types/lyrics'

const PLACEHOLDER_ACTIVE_LINES: ActiveLines = {
  prev: { timeMs: 0, text: 'Waiting for music...' },
  current: { timeMs: 0, text: '♪  goLyrics  ♪' },
  next: { timeMs: 0, text: 'Press Option+Space to detect song' },
  currentIndex: 1,
  activeWordIndex: -1
}

function interpolateWords(line: LrcLine, nextLineStartMs: number): LrcWord[] {
  const tokens = line.text.split(/\s+/).filter(Boolean)
  if (!tokens.length) return []

  const lineEndMs = Math.max(nextLineStartMs, line.timeMs + 1000)
  const duration = lineEndMs - line.timeMs
  const step = duration / tokens.length

  return tokens.map((text, index) => ({
    timeMs: Math.round(line.timeMs + step * index),
    text
  }))
}

function getWordsForLine(line: LrcLine, lines: LrcLine[], index: number): LrcWord[] {
  if (line.words?.length) return line.words
  const nextStart = index < lines.length - 1 ? lines[index + 1].timeMs : line.timeMs + 4000
  return interpolateWords(line, nextStart)
}

function findActiveWordIndex(words: LrcWord[], adjustedMs: number): number {
  if (!words.length) return -1

  let active = 0
  for (let i = 0; i < words.length; i++) {
    if (words[i].timeMs <= adjustedMs) active = i
    else break
  }
  return active
}

/**
 * Matches playback position against timestamped LRC lines and word timings.
 */
export class KaraokeSyncEngine {
  private lyrics: ParsedLyrics | null = null
  private positionMs = 0

  setLyrics(lyrics: ParsedLyrics | null): void {
    this.lyrics = lyrics
  }

  setPositionMs(positionMs: number): void {
    this.positionMs = positionMs
  }

  getActiveLines(): ActiveLines {
    if (!this.lyrics || this.lyrics.lines.length === 0) {
      return PLACEHOLDER_ACTIVE_LINES
    }

    const { lines, offsetMs = 0 } = this.lyrics
    const adjusted = this.positionMs - offsetMs

    let currentIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].timeMs <= adjusted) {
        currentIndex = i
      } else {
        break
      }
    }

    if (currentIndex === -1) {
      return {
        prev: null,
        current: null,
        next: lines[0] ?? null,
        currentIndex: -1,
        activeWordIndex: -1
      }
    }

    const current: LrcLine = {
      ...lines[currentIndex],
      words: getWordsForLine(lines[currentIndex], lines, currentIndex)
    }
    const prev: LrcLine | null =
      currentIndex > 0
        ? {
            ...lines[currentIndex - 1],
            words: getWordsForLine(lines[currentIndex - 1], lines, currentIndex - 1)
          }
        : null
    const next: LrcLine | null =
      currentIndex < lines.length - 1
        ? {
            ...lines[currentIndex + 1],
            words: getWordsForLine(lines[currentIndex + 1], lines, currentIndex + 1)
          }
        : null

    const activeWordIndex = findActiveWordIndex(current.words ?? [], adjusted)

    return { prev, current, next, currentIndex, activeWordIndex }
  }

  clear(): void {
    this.lyrics = null
    this.positionMs = 0
  }
}
