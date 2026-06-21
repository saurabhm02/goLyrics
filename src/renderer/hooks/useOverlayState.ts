import { useEffect, useState } from 'react'
import type { OverlayState } from '../../shared/types/settings'

const DEFAULT_STATE: OverlayState = {
  visible: true,
  clickThrough: true,
  dragMode: false,
  x: 0,
  y: 0,
  width: 720,
  height: 56,
  opacity: 0.92,
  fontSizePx: 34,
  fontPreset: 'classic',
  dualLineMode: false
}

export function useOverlayState(): OverlayState {
  const [state, setState] = useState<OverlayState>(DEFAULT_STATE)

  useEffect(() => {
    window.goLyrics
      .getOverlayState()
      .then(setState)
      .catch(() => {})

    const unsubscribe = window.goLyrics.onOverlayStateChanged(setState)
    return unsubscribe
  }, [])

  return state
}
