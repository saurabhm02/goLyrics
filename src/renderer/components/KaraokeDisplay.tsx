import React from 'react'
import type { ActiveLines } from '../../shared/types/lyrics'

// Phase 1 placeholder — hardcoded lines until Phase 2 wires the sync engine
const PLACEHOLDER_LINES: ActiveLines = {
  prev: { timeMs: 0, text: 'Waiting for music...' },
  current: { timeMs: 0, text: '♪  LyricOverlay  ♪' },
  next: { timeMs: 0, text: 'Press Option+Space to detect song' },
  currentIndex: 1
}

interface KaraokeDisplayProps {
  lines?: ActiveLines
  dragMode: boolean
}

export function KaraokeDisplay({
  lines = PLACEHOLDER_LINES,
  dragMode
}: KaraokeDisplayProps): React.JSX.Element {
  const { prev, current, next } = lines

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 px-6 py-4 ${dragMode ? 'pt-1' : 'py-4'}`}
    >
      {/* Previous line */}
      <div
        className="text-sm font-medium text-white/40 truncate max-w-full transition-all duration-300 animate-fade-in"
        aria-label="previous lyric line"
      >
        {prev?.text ?? ''}
      </div>

      {/* Current line — highlighted */}
      <div
        className="text-xl font-semibold text-white drop-shadow-lg truncate max-w-full transition-all duration-300 animate-slide-up"
        aria-label="current lyric line"
        aria-live="polite"
      >
        {current?.text ?? ''}
      </div>

      {/* Next line */}
      <div
        className="text-sm font-medium text-white/40 truncate max-w-full transition-all duration-300 animate-fade-in"
        aria-label="next lyric line"
      >
        {next?.text ?? ''}
      </div>
    </div>
  )
}
