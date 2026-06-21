import React, { useState, useEffect } from 'react'
import { OverlayShell } from './components/OverlayShell'
import { SettingsApp } from './settings/SettingsApp'
import { OnboardingApp } from './onboarding/OnboardingApp'
import type { ActiveLines } from '../shared/types/lyrics'
import type { NowPlayingTrack } from '../shared/types/song'
import type { FontPreset, OverlayPanelMode, OverlaySettings } from '../shared/types/settings'
import './styles/panel.css'

function applyVisualSettings(settings: OverlaySettings): void {
  const root = document.documentElement
  root.style.setProperty('--lyrics-font-size', `${settings.fontSizePx}px`)
  root.dataset.fontPreset = settings.fontPreset

  const presetVars: Record<FontPreset, Record<string, string>> = {
    classic: {
      '--lyrics-font-family': '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      '--lyrics-font-weight': '700',
      '--lyrics-letter-spacing': '0',
      '--lyrics-line-height': '1.35'
    },
    bold: {
      '--lyrics-font-family': '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      '--lyrics-font-weight': '800',
      '--lyrics-letter-spacing': '0.02em',
      '--lyrics-line-height': '1.3'
    },
    cinematic: {
      '--lyrics-font-family': 'Georgia, "Iowan Old Style", "Palatino Linotype", serif',
      '--lyrics-font-weight': '600',
      '--lyrics-letter-spacing': '0.04em',
      '--lyrics-line-height': '1.4'
    },
    devanagari: {
      '--lyrics-font-family': '"Noto Sans Devanagari", "Kohinoor Devanagari", system-ui, sans-serif',
      '--lyrics-font-weight': '700',
      '--lyrics-letter-spacing': '0',
      '--lyrics-line-height': '1.5'
    }
  }

  const vars = presetVars[settings.fontPreset] ?? presetVars.classic
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

export default function App(): React.JSX.Element {
  const [lines, setLines] = useState<ActiveLines | undefined>(undefined)
  const [track, setTrack] = useState<NowPlayingTrack | null>(null)
  const [panelMode, setPanelMode] = useState<OverlayPanelMode>('lyrics')

  useEffect(() => {
    const unsubLyrics = window.goLyrics.onLyricsChanged(setLines)
    const unsubTrack = window.goLyrics.onTrackChanged(setTrack)
    const unsubSettings = window.goLyrics.onSettingsChanged((settings) => {
      applyVisualSettings(settings)
    })
    const unsubPanel = window.goLyrics.onPanelModeChanged(setPanelMode)

    void window.goLyrics.getSettings().then((settings) => {
      applyVisualSettings(settings)
    })
    void window.goLyrics.getPanelMode().then(setPanelMode)

    return () => {
      unsubLyrics()
      unsubTrack()
      unsubSettings()
      unsubPanel()
    }
  }, [])

  if (panelMode === 'settings') {
    return (
      <div className="panel-shell">
        <SettingsApp onClose={() => void window.goLyrics.closePanel()} />
      </div>
    )
  }

  if (panelMode === 'onboarding') {
    return (
      <div className="panel-shell">
        <OnboardingApp />
      </div>
    )
  }

  return <OverlayShell lines={lines} track={track} />
}
