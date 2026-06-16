import type { ParsedLyrics, ActiveLines, LrcLine } from '../shared/types/lyrics'

const PLACEHOLDER_ACTIVE_LINES: ActiveLines = {
  prev: { timeMs: 0, text: 'Waiting for music...' },
  current: { timeMs: 0, text: '♪  LyricOverlay  ♪' },
  next: { timeMs: 0, text: 'Press Option+Space to detect song' },
  currentIndex: 1
}

/**
 * Matches a playback position (ms) against timestamped LRC lines to
 * determine which line is current, and which are prev/next.
 *
 * Phase 1: returns placeholder data (no real track loaded).
 * Phase 2: real position tracking, animation hooks, offset support.
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

    // Find the last line whose timestamp is <= current position
    let currentIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].timeMs <= adjusted) {
        currentIndex = i
      } else {
        break
      }
    }

    if (currentIndex === -1) {
      // Before the first line
      return {
        prev: null,
        current: null,
        next: lines[0] ?? null,
        currentIndex: -1
      }
    }

    const current: LrcLine = lines[currentIndex]
    const prev: LrcLine | null = currentIndex > 0 ? lines[currentIndex - 1] : null
    const next: LrcLine | null =
      currentIndex < lines.length - 1 ? lines[currentIndex + 1] : null

    return { prev, current, next, currentIndex }
  }

  clear(): void {
    this.lyrics = null
    this.positionMs = 0
  }
}
