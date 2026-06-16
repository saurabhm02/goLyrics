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
    <div className="drag-region drag-handle" title="Drag to reposition">
      {/* Pill indicator */}
      <div className="no-drag drag-handle-pill" />
    </div>
  )
}
