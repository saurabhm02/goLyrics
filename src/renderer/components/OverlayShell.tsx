import React from 'react'
import { DragHandle } from './DragHandle'
import { KaraokeDisplay } from './KaraokeDisplay'
import { useOverlayState } from '../hooks/useOverlayState'
import type { ActiveLines } from '../../shared/types/lyrics'

interface OverlayShellProps {
  lines?: ActiveLines
}

/**
 * Root overlay container. Renders a frosted-glass pill card.
 * Its background is transparent when click-through is active;
 * a subtle backdrop-blur card shows during drag mode or when lyrics
 * are actively displayed.
 */
export function OverlayShell({ lines }: OverlayShellProps): React.JSX.Element {
  const state = useOverlayState()

  // In click-through mode: always show the card so lyrics are readable.
  // In drag mode: show the drag handle and slightly increase opacity.
  const cardOpacity = state.dragMode ? 'bg-black/60' : 'bg-black/40'

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className={`
          w-full max-w-full
          ${cardOpacity}
          backdrop-blur-md
          rounded-2xl
          border border-white/10
          shadow-2xl
          overflow-hidden
          transition-all duration-300
        `}
        style={{ opacity: state.opacity }}
      >
        <DragHandle visible={state.dragMode} />
        <KaraokeDisplay lines={lines} dragMode={state.dragMode} />

        {state.dragMode && (
          <div className="no-drag flex items-center justify-center pb-2">
            <span className="text-xs text-white/30 font-medium tracking-wide">
              DRAG MODE — Option+L to hide
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
