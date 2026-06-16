import React from 'react'

interface DragHandleProps {
  visible: boolean
}

/**
 * A thin grab bar at the top of the overlay, only rendered (and only
 * functional) when the window is in drag mode. The `.drag-region` CSS
 * class sets `-webkit-app-region: drag` so macOS treats it as the
 * window drag target.
 */
export function DragHandle({ visible }: DragHandleProps): React.JSX.Element | null {
  if (!visible) return null

  return (
    <div
      className="drag-region flex items-center justify-center w-full h-6 cursor-grab rounded-t-2xl"
      title="Drag to reposition"
    >
      {/* Pill indicator */}
      <div className="no-drag w-10 h-1 rounded-full bg-white/30" />
    </div>
  )
}
