import React, { useState, useEffect } from 'react'
import { OverlayShell } from './components/OverlayShell'
import type { ActiveLines } from '../shared/types/lyrics'
import type { NowPlayingTrack } from '../shared/types/song'

/**
 * Root React component for the overlay renderer.
 * Subscribes to lyric line changes from the main process.
 */
export default function App(): React.JSX.Element {
  const [lines, setLines] = useState<ActiveLines | undefined>(undefined)
  const [track, setTrack] = useState<NowPlayingTrack | null>(null)

  useEffect(() => {
    const unsubLyrics = window.goLyrics.onLyricsChanged(setLines)
    const unsubTrack = window.goLyrics.onTrackChanged(setTrack)
    const unsubTextColor = window.goLyrics.onLyricsTextColorChanged((color) => {
      document.documentElement.style.setProperty('--lyrics-color', color)
      document.documentElement.style.setProperty(
        '--lyrics-muted-color',
        color === 'white' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
      )
      document.documentElement.style.setProperty(
        '--lyrics-handle-color',
        color === 'white' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
      )
    })
    return () => {
      unsubLyrics()
      unsubTrack()
      unsubTextColor()
    }
  }, [])

  return <OverlayShell lines={lines} track={track} />
}
