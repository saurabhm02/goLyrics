import React from 'react'
import { DragHandle } from './DragHandle'
import { KaraokeDisplay } from './KaraokeDisplay'
import { useOverlayState } from '../hooks/useOverlayState'
import type { ActiveLines } from '../../shared/types/lyrics'
import type { NowPlayingTrack } from '../../shared/types/song'

interface OverlayShellProps {
  lines?: ActiveLines
  track?: NowPlayingTrack | null
}

export function OverlayShell({ lines, track }: OverlayShellProps): React.JSX.Element {
  const state = useOverlayState()

  return (
    <div className={`overlay-shell ${state.dragMode ? 'drag-mode' : 'click-through'}`}>
      <div className="overlay-content" style={{ opacity: state.opacity }}>
        <DragHandle visible={state.dragMode} />
        <KaraokeDisplay
          lines={lines}
          track={track}
          dragMode={state.dragMode}
          dualLineMode={state.dualLineMode}
        />
      </div>
    </div>
  )
}
