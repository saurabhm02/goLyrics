import React, { useEffect, useRef } from 'react'
import type { ActiveLines, LrcLine } from '../../shared/types/lyrics'
import type { NowPlayingTrack } from '../../shared/types/song'

interface KaraokeDisplayProps {
  lines?: ActiveLines
  track?: NowPlayingTrack | null
  dragMode: boolean
  dualLineMode?: boolean
}

function renderWords(line: LrcLine, activeWordIndex: number): React.ReactNode {
  const words = line.words
  if (!words?.length) return line.text

  return words.map((word, index) => (
    <span key={`${word.timeMs}-${index}`} className={index === activeWordIndex ? 'karaoke-word active' : 'karaoke-word'}>
      {word.text}
      {index < words.length - 1 ? ' ' : ''}
    </span>
  ))
}

function KaraokeLine({
  line,
  activeWordIndex,
  variant
}: {
  line: LrcLine
  activeWordIndex: number
  variant: 'current' | 'next'
}): React.JSX.Element {
  return (
    <div className={`karaoke-line karaoke-line-${variant}`} aria-live={variant === 'current' ? 'polite' : 'off'}>
      {variant === 'current' ? renderWords(line, activeWordIndex) : line.text}
    </div>
  )
}

export function KaraokeDisplay({
  lines,
  track,
  dragMode,
  dualLineMode = false
}: KaraokeDisplayProps): React.JSX.Element {
  const prevIndexRef = useRef<number>(-1)
  const hasLine = Boolean(lines?.current?.text?.trim())
  const displayLines: ActiveLines | null = hasLine
    ? (lines as ActiveLines)
    : track
      ? {
          prev: null,
          current: { timeMs: 0, text: `${track.artist} · ${track.title}` },
          next: null,
          currentIndex: 0,
          activeWordIndex: -1
        }
      : null

  const currentIndex = displayLines?.currentIndex ?? -1
  useEffect(() => {
    prevIndexRef.current = currentIndex
  }, [currentIndex])

  const lineChanged = prevIndexRef.current !== -1 && prevIndexRef.current !== currentIndex

  if (!displayLines?.current?.text) {
    return dragMode ? (
      <div className="karaoke-empty-wrap">
        <div className="karaoke-drag-label">Drag mode enabled</div>
      </div>
    ) : (
      <div className="karaoke-empty-wrap">
        <div className="karaoke-idle">goLyrics</div>
      </div>
    )
  }

  const { current, next, activeWordIndex } = displayLines
  const showNext = dualLineMode && next?.text?.trim()

  return (
    <div className={`karaoke-wrap ${dragMode ? 'karaoke-wrap-drag' : ''} ${dualLineMode ? 'karaoke-wrap-dual' : ''}`}>
      <div
        className={`karaoke-lines ${lineChanged ? 'karaoke-lines-transition' : ''}`}
        aria-label="current lyric line"
      >
        {current ? (
          <KaraokeLine line={current} activeWordIndex={activeWordIndex} variant="current" />
        ) : null}
        {showNext && next ? <KaraokeLine line={next} activeWordIndex={-1} variant="next" /> : null}
      </div>

      {dragMode && <div className="karaoke-drag-label">Drag mode enabled</div>}
    </div>
  )
}
