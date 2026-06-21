import React, { useEffect, useState } from 'react'
import type {
  FontPreset,
  LyricsScriptMode,
  OverlaySettings,
  SafeAreaProfile,
  YouTubeBrowser
} from '../../shared/types/settings'
import {
  DEFAULT_FONT_SIZE_PX,
  DEFAULT_LYRIC_LEAD_MS,
  SYNC_OFFSET_STEP_MS
} from '../../shared/constants/defaults'
import { MacWindowChrome } from '../components/MacWindowChrome'
import { SettingsSidebar, type SettingsSection } from '../components/SettingsSidebar'
import { ToggleRow } from '../components/ToggleRow'

const FONT_PRESETS: { id: FontPreset; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'bold', label: 'Bold' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'devanagari', label: 'Devanagari' }
]

const LYRICS_SCRIPT_MODES: { id: LyricsScriptMode; label: string; hint: string }[] = [
  {
    id: 'romanized',
    label: 'Romanized',
    hint: 'Hindi, Punjabi, and other Indic lyrics shown in Latin letters (Hinglish-style pronunciation).'
  },
  {
    id: 'original',
    label: 'Original',
    hint: 'Keep the native script (Devanagari, Gurmukhi, etc.). English songs stay in English.'
  }
]

const SAFE_AREA_PROFILES: { id: SafeAreaProfile; label: string; hint: string }[] = [
  { id: 'dock', label: 'Dock', hint: 'Sits above the macOS Dock.' },
  { id: 'fullscreen', label: 'Fullscreen', hint: 'Lowest placement for fullscreen video.' },
  { id: 'notch', label: 'Notch', hint: 'Extra clearance for notched displays.' }
]

const YOUTUBE_BROWSERS: { id: YouTubeBrowser; label: string }[] = [
  { id: 'none', label: 'Off' },
  { id: 'chrome', label: 'Chrome' },
  { id: 'arc', label: 'Arc' },
  { id: 'edge', label: 'Edge' },
  { id: 'safari', label: 'Safari' }
]

const SECTION_TITLES: Record<SettingsSection, string> = {
  appearance: 'Appearance',
  sync: 'Sync',
  sources: 'Sources',
  system: 'System',
  maintenance: 'Maintenance'
}

interface SettingsAppProps {
  onClose?: () => void
}

export function SettingsApp({ onClose }: SettingsAppProps): React.JSX.Element {
  const [settings, setSettings] = useState<OverlaySettings | null>(null)
  const [cacheMessage, setCacheMessage] = useState('')
  const [section, setSection] = useState<SettingsSection>('appearance')

  useEffect(() => {
    window.goLyrics.getSettings().then(setSettings)
    return window.goLyrics.onSettingsChanged(setSettings)
  }, [])

  if (!settings) {
    return (
      <div className="mac-app">
        <MacWindowChrome title="goLyrics Settings" onClose={onClose} />
        <div className="mac-loading">Loading settings…</div>
      </div>
    )
  }

  const update = (patch: Partial<OverlaySettings>): void => {
    void window.goLyrics.updateSettings(patch).then(setSettings)
  }

  return (
    <div className="mac-app mac-settings-app">
      <MacWindowChrome title="goLyrics Settings" onClose={onClose} />
      <div className="mac-settings-body">
        <SettingsSidebar active={section} onChange={setSection} />
        <main className="mac-detail no-drag">
          <header className="mac-detail-header">
            <h1>{SECTION_TITLES[section]}</h1>
          </header>

          {section === 'appearance' ? (
            <div className="mac-group">
              <div className="mac-row mac-row-slider">
                <div className="mac-row-label">
                  <span>Overlay opacity</span>
                  <span className="mac-value">{Math.round(settings.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={1}
                  step={0.01}
                  value={settings.opacity}
                  onChange={(e) => update({ opacity: Number(e.target.value) })}
                />
              </div>
              <div className="mac-row mac-row-slider">
                <div className="mac-row-label">
                  <span>Font size</span>
                  <span className="mac-value">{settings.fontSizePx}px</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={48}
                  step={1}
                  value={settings.fontSizePx}
                  onChange={(e) => update({ fontSizePx: Number(e.target.value) })}
                />
              </div>
              <div className="mac-row mac-row-stack">
                <span className="mac-row-label-text">Font preset</span>
                <div className="mac-segmented">
                  {FONT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`mac-segment ${settings.fontPreset === preset.id ? 'active' : ''}`}
                      onClick={() => update({ fontPreset: preset.id })}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mac-row mac-row-stack">
                <span className="mac-row-label-text">Lyrics script</span>
                <div className="mac-segmented">
                  {LYRICS_SCRIPT_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`mac-segment ${settings.lyricsScriptMode === mode.id ? 'active' : ''}`}
                      onClick={() => update({ lyricsScriptMode: mode.id })}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <p className="mac-hint">
                  {LYRICS_SCRIPT_MODES.find((mode) => mode.id === settings.lyricsScriptMode)?.hint}
                </p>
              </div>
              <ToggleRow
                label="Dual-line mode"
                hint="Show the current line and a preview of the next line."
                checked={settings.dualLineMode}
                onChange={(checked) => update({ dualLineMode: checked })}
              />
              <div className="mac-row mac-row-stack">
                <span className="mac-row-label-text">Safe-area profile</span>
                <div className="mac-segmented">
                  {SAFE_AREA_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      className={`mac-segment ${settings.safeAreaProfile === profile.id ? 'active' : ''}`}
                      onClick={() => update({ safeAreaProfile: profile.id })}
                    >
                      {profile.label}
                    </button>
                  ))}
                </div>
                <p className="mac-hint">
                  {SAFE_AREA_PROFILES.find((p) => p.id === settings.safeAreaProfile)?.hint}
                </p>
              </div>
            </div>
          ) : null}

          {section === 'sync' ? (
            <div className="mac-group">
              <div className="mac-row mac-row-stack">
                <label className="mac-row-label-text" htmlFor="lyric-lead">
                  Global lyric lead
                </label>
                <input
                  id="lyric-lead"
                  className="mac-input"
                  type="number"
                  value={settings.lyricLeadMs}
                  onChange={(e) => update({ lyricLeadMs: Number(e.target.value) })}
                />
                <p className="mac-hint">
                  Default {DEFAULT_LYRIC_LEAD_MS} ms. Option+↑/↓ nudges ±{SYNC_OFFSET_STEP_MS}ms per track;
                  Option+0 resets.
                </p>
              </div>
            </div>
          ) : null}

          {section === 'sources' ? (
            <div className="mac-group">
              <p className="mac-hint mac-hint-block">
                Only enabled sources are polled for now playing. Fewer sources reduce CPU usage and
                AppleScript load.
              </p>
              <ToggleRow
                label="macOS Now Playing"
                hint="Reads system media controls (Control Center). Lightweight."
                checked={settings.enableMacOSNowPlaying}
                onChange={(checked) => update({ enableMacOSNowPlaying: checked })}
              />
              <ToggleRow
                label="Spotify"
                hint="Detect playback from the Spotify app."
                checked={settings.enableSpotify}
                onChange={(checked) => update({ enableSpotify: checked })}
              />
              <ToggleRow
                label="Apple Music"
                hint="Detect playback from the Music app."
                checked={settings.enableAppleMusic}
                onChange={(checked) => update({ enableAppleMusic: checked })}
              />
              <div className="mac-row mac-row-stack">
                <span className="mac-row-label-text">YouTube in browser</span>
                <div className="mac-segmented">
                  {YOUTUBE_BROWSERS.map((browser) => (
                    <button
                      key={browser.id}
                      type="button"
                      className={`mac-segment ${settings.youtubeBrowser === browser.id ? 'active' : ''}`}
                      onClick={() => update({ youtubeBrowser: browser.id })}
                    >
                      {browser.label}
                    </button>
                  ))}
                </div>
                {settings.youtubeBrowser === 'all' ? (
                  <p className="mac-hint">
                    You&apos;re polling all browsers (legacy). Pick one to reduce CPU usage.
                  </p>
                ) : (
                  <p className="mac-hint">
                    Only the selected browser is scanned for YouTube tabs each poll.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {section === 'system' ? (
            <div className="mac-group">
              <ToggleRow
                label="Launch at login"
                hint="Start goLyrics automatically when you sign in."
                checked={settings.launchAtLogin}
                onChange={(checked) => update({ launchAtLogin: checked })}
              />
              <ToggleRow
                label="Show in Dock"
                hint="Display the app icon in the macOS Dock."
                checked={settings.showInDock}
                onChange={(checked) => update({ showInDock: checked })}
              />
            </div>
          ) : null}

          {section === 'maintenance' ? (
            <div className="mac-group">
              <div className="mac-row mac-row-actions">
                <button
                  className="mac-btn mac-btn-secondary"
                  type="button"
                  onClick={() => void window.goLyrics.resetOverlayPosition()}
                >
                  Reset overlay position
                </button>
                <button
                  className="mac-btn mac-btn-secondary"
                  type="button"
                  onClick={() => {
                    void window.goLyrics.clearLyricsCache().then((count) => {
                      setCacheMessage(`Cleared ${count} cached ${count === 1 ? 'entry' : 'entries'}`)
                    })
                  }}
                >
                  Clear lyrics cache
                </button>
              </div>
              {cacheMessage ? <p className="mac-status">{cacheMessage}</p> : null}
              <p className="mac-hint mac-hint-block">
                Lyrics use white text with a dark outline for readability on any background. Base font
                default: {DEFAULT_FONT_SIZE_PX}px.
              </p>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
