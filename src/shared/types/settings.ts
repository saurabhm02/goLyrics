export type FontPreset = 'classic' | 'bold' | 'cinematic' | 'devanagari'
export type SafeAreaProfile = 'dock' | 'fullscreen' | 'notch'
export type YouTubeBrowser = 'none' | 'chrome' | 'arc' | 'edge' | 'safari' | 'all'
export type OverlayPanelMode = 'lyrics' | 'settings' | 'onboarding'
/** original = native script; romanized = Latin letters (Hinglish / readable pronunciation). */
export type LyricsScriptMode = 'original' | 'romanized'

export interface OverlaySettings {
  x: number
  y: number
  width: number
  height: number
  visible: boolean
  clickThrough: boolean
  dragMode: boolean
  showInDock: boolean
  opacity: number
  lyricLeadMs: number
  fontSizePx: number
  fontPreset: FontPreset
  dualLineMode: boolean
  safeAreaProfile: SafeAreaProfile
  launchAtLogin: boolean
  onboardingComplete: boolean
  songSourcesVersion?: number
  enableMacOSNowPlaying: boolean
  enableSpotify: boolean
  enableAppleMusic: boolean
  youtubeBrowser: YouTubeBrowser
  useCustomPosition: boolean
  lyricsScriptMode: LyricsScriptMode
}

export interface OverlayState {
  visible: boolean
  clickThrough: boolean
  dragMode: boolean
  x: number
  y: number
  width: number
  height: number
  opacity: number
  fontSizePx: number
  fontPreset: FontPreset
  dualLineMode: boolean
}
