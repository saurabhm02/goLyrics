import { useEffect, useState } from 'react'
import type { OverlayState } from '../../shared/types/settings'

const DEFAULT_STATE: OverlayState = {
  visible: true,
  clickThrough: true,
  dragMode: false,
  x: 0,
  y: 0,
  width: 600,
  height: 160,
  opacity: 0.92
}

export function useOverlayState(): OverlayState {
  const [state, setState] = useState<OverlayState>(DEFAULT_STATE)

  useEffect(() => {
    // Fetch initial state from main process
    window.goLyrics
      .getOverlayState()
      .then(setState)
      .catch(() => {})

    // Subscribe to state changes pushed from main
    const unsubscribe = window.goLyrics.onOverlayStateChanged(setState)
    return unsubscribe
  }, [])

  return state
}
