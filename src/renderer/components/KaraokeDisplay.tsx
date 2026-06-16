import React from 'react'
import type { ActiveLines } from '../../shared/types/lyrics'
import type { NowPlayingTrack } from '../../shared/types/song'

interface KaraokeDisplayProps {
  lines?: ActiveLines
  track?: NowPlayingTrack | null
  dragMode: boolean
}

export function KaraokeDisplay({
  lines,
  track,
  dragMode
}: KaraokeDisplayProps): React.JSX.Element {
  const hasLine = Boolean(lines?.current?.text?.trim())
  const displayLines: ActiveLines | null = hasLine
    ? (lines as ActiveLines)
    : track
      ? {
          prev: null,
          current: { timeMs: 0, text: `${track.artist} · ${track.title}` },
          next: null,
          currentIndex: 0
        }
      : null

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

  const { current } = displayLines

  return (
    <div className={`karaoke-wrap ${dragMode ? 'karaoke-wrap-drag' : ''}`}>
      <div
        className="karaoke-line"
        aria-label="current lyric line"
        aria-live="polite"
      >
        {current?.text ?? ''}
      </div>

      {dragMode && (
        <div className="karaoke-drag-label">Drag mode enabled</div>
      )}
    </div>
  )
}
