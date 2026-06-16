import React, { useState, useEffect } from 'react'
import { OverlayShell } from './components/OverlayShell'
import type { ActiveLines } from '../shared/types/lyrics'

/**
 * Root React component for the overlay renderer.
 * Subscribes to lyric line changes from the main process.
 */
export default function App(): React.JSX.Element {
  const [lines, setLines] = useState<ActiveLines | undefined>(undefined)

  useEffect(() => {
    const unsub = window.lyricOverlay.onLyricsChanged(setLines)
    return unsub
  }, [])

  return <OverlayShell lines={lines} />
}
