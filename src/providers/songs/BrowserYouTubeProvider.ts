import type { SongProvider } from './SongProvider'
import type { NowPlayingTrack } from '../../shared/types/song'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface BrowserYouTubeConfig {
  id: string
  name: string
  processName: string
  appName: string
  supportsJsAppleEvents: boolean
}

function buildReadTabScript(appName: string): string {
  return `
tell application "${appName}"
  if (count of windows) = 0 then return ""
  set firstYoutubeData to ""
  set wi to 0
  repeat with w in windows
    set wi to wi + 1
    set ti to 0
    repeat with t in tabs of w
      set ti to ti + 1
      try
        set tabUrl to URL of t
        if tabUrl contains "youtube.com/watch" or tabUrl contains "youtu.be/" then
          set tabTitle to title of t
          if tabTitle does not end with " - YouTube" then
            return tabTitle & "||" & tabUrl & "||" & (wi as text) & "||" & (ti as text)
          end if
          if firstYoutubeData is "" then
            set firstYoutubeData to tabTitle & "||" & tabUrl & "||" & (wi as text) & "||" & (ti as text)
          end if
        end if
      on error
      end try
    end repeat
  end repeat
  return firstYoutubeData
end tell
`
}

function buildPlayerStateScript(appName: string, windowIndex: string, tabIndex: string): string {
  return `
tell application "${appName}"
  if (count of windows) = 0 then return ""
  set wi to ${windowIndex}
  set ti to ${tabIndex}
  set currentTab to tab ti of window wi
  set currentSeconds to execute currentTab javascript "(() => { const v = document.querySelector('video'); return v ? String(v.currentTime || 0) : ''; })();"
  set durationSeconds to execute currentTab javascript "(() => { const v = document.querySelector('video'); return v ? String(v.duration || 0) : ''; })();"
  set pausedState to execute currentTab javascript "(() => { const v = document.querySelector('video'); return v ? (v.paused ? '1' : '0') : '1'; })();"
  set endedState to execute currentTab javascript "(() => { const v = document.querySelector('video'); return v ? (v.ended ? '1' : '0') : '0'; })();"
  set liveCaption to execute currentTab javascript "(() => { const selectors = ['.ytp-caption-segment', '.captions-text span', '.ytp-caption-window-container span']; for (const sel of selectors) { const parts = Array.from(document.querySelectorAll(sel)).map(n => (n.textContent || '').trim()).filter(Boolean); if (parts.length) return parts.join(' '); } return ''; })();"
  set channelName to execute currentTab javascript "(() => { const selectors = ['#channel-name #text a', 'ytd-channel-name #text', '#owner #channel-name yt-formatted-string', 'ytd-video-owner-renderer #channel-name #text']; for (const sel of selectors) { const text = document.querySelector(sel)?.textContent?.trim(); if (text) return text; } return ''; })();"
  set pageMeta to execute currentTab javascript "(() => { const pageVideoId = new URLSearchParams(location.search).get('v') || ''; const h1 = document.querySelector('h1 yt-formatted-string, ytd-watch-metadata h1 yt-formatted-string'); const pageTitle = h1?.textContent?.trim() || ''; return pageTitle + '||' + pageVideoId; })();"
  return currentSeconds & "||" & durationSeconds & "||" & pausedState & "||" & endedState & "||" & liveCaption & "||" & channelName & "||" & pageMeta
end tell
`
}

const SAFARI_READ_TAB_SCRIPT = `
tell application "Safari"
  if (count of windows) = 0 then return ""
  set firstYoutubeData to ""
  repeat with w in windows
    repeat with t in tabs of w
      try
        set tabUrl to URL of t
        if tabUrl contains "youtube.com/watch" or tabUrl contains "youtu.be/" then
          set tabTitle to name of t
          return tabTitle & "||" & tabUrl
        end if
      on error
      end try
    end repeat
  end repeat
  return firstYoutubeData
end tell
`

function cleanYouTubeTitle(rawTitle: string): string {
  return rawTitle.replace(/\s*-\s*YouTube\s*$/i, '').trim()
}

function resolveYouTubeArtist(title: string, channelName?: string): string {
  const parts = title.split(' - ').map((part) => part.trim()).filter(Boolean)
  if (parts.length > 1) return parts[0]
  const channel = channelName?.trim()
  if (channel) return channel
  return 'YouTube'
}

export class BrowserYouTubeProvider implements SongProvider {
  readonly id: string
  readonly name: string
  private warnedAboutAutomation = false
  private warnedAboutJsInAppleEvents = false

  constructor(private readonly config: BrowserYouTubeConfig) {
    this.id = config.id
    this.name = config.name
  }

  async isAvailable(): Promise<boolean> {
    if (process.platform !== 'darwin') return false
    try {
      await execFileAsync('/usr/bin/pgrep', ['-x', this.config.processName])
      return true
    } catch {
      return false
    }
  }

  async getNowPlaying(): Promise<NowPlayingTrack | null> {
    if (this.config.appName === 'Safari') {
      return this.getSafariYouTube()
    }
    return this.getChromiumYouTube()
  }

  private async getSafariYouTube(): Promise<NowPlayingTrack | null> {
    try {
      const { stdout } = await execFileAsync('/usr/bin/osascript', ['-e', SAFARI_READ_TAB_SCRIPT])
      const raw = stdout.trim()
      if (!raw) return null

      const [rawTitle, rawUrl] = raw.split('||')
      if (!rawUrl?.includes('youtube')) return null

      const title = cleanYouTubeTitle(rawTitle)
      if (!title) return null

      return {
        title,
        artist: resolveYouTubeArtist(title),
        positionMs: 0,
        sourceUrl: rawUrl,
        ended: false,
        isPlaying: true,
        source: 'youtube',
        providerId: this.id
      }
    } catch {
      this.warnAutomation()
      return null
    }
  }

  private async getChromiumYouTube(): Promise<NowPlayingTrack | null> {
    try {
      const { stdout } = await execFileAsync('/usr/bin/osascript', [
        '-e',
        buildReadTabScript(this.config.appName)
      ])
      const raw = stdout.trim()
      if (!raw) return null

      const [rawTitle, rawUrlParts, rawWindowIndex = '1', rawTabIndex = '1'] = raw.split('||')
      let rawUrl = rawUrlParts
      if (!rawUrl?.includes('youtube')) return null

      let title = cleanYouTubeTitle(rawTitle)
      if (!title) return null
      let sourceUrl = rawUrl

      let positionMs = 0
      let isPlaying = true
      let durationMs: number | undefined
      let ended = false
      let liveCaptionText: string | undefined
      let channelName: string | undefined

      if (this.config.supportsJsAppleEvents) {
        try {
          const playerScript = buildPlayerStateScript(
            this.config.appName,
            rawWindowIndex,
            rawTabIndex
          )
          const { stdout: playerStdout } = await execFileAsync('/usr/bin/osascript', ['-e', playerScript])
          const parts = playerStdout.trim().split('||')
          const rawPositionSeconds = parts[0] ?? '0'
          const rawDurationSeconds = parts[1] ?? '0'
          const rawPaused = parts[2] ?? '1'
          const rawEnded = parts[3] ?? '0'
          const rawCaption = parts[4] ?? ''
          const rawChannelName = parts[5] ?? ''
          const rawPageTitle = parts[6] ?? ''
          const rawPageVideoId = parts[7] ?? ''

          positionMs = Math.max(0, Math.round(Number.parseFloat(rawPositionSeconds) * 1000))
          durationMs = Math.max(0, Math.round(Number.parseFloat(rawDurationSeconds) * 1000))
          isPlaying = rawPaused !== '1'
          ended = rawEnded === '1'
          liveCaptionText = rawCaption?.trim() || undefined
          channelName = rawChannelName?.trim() || undefined

          const pageTitle = rawPageTitle?.trim()
          const pageVideoId = rawPageVideoId?.trim()
          if (pageTitle) {
            title = cleanYouTubeTitle(pageTitle)
          }
          if (pageVideoId && sourceUrl.includes('youtube')) {
            const url = new URL(sourceUrl)
            url.searchParams.set('v', pageVideoId)
            sourceUrl = url.toString()
          }
        } catch {
          if (!this.warnedAboutJsInAppleEvents) {
            this.warnedAboutJsInAppleEvents = true
            console.warn(
              `[${this.id}] Song detected but cannot read playback time. Enable "Allow JavaScript from Apple Events" in the browser for precise sync.`
            )
          }
        }
      }

      return {
        title,
        artist: resolveYouTubeArtist(title, channelName),
        durationMs: durationMs && Number.isFinite(durationMs) ? durationMs : undefined,
        positionMs: Number.isFinite(positionMs) ? positionMs : 0,
        sourceUrl,
        liveCaptionText,
        ended,
        isPlaying,
        source: 'youtube',
        providerId: this.id
      }
    } catch {
      this.warnAutomation()
      return null
    }
  }

  private warnAutomation(): void {
    if (!this.warnedAboutAutomation) {
      this.warnedAboutAutomation = true
      console.warn(
        `[${this.id}] Unable to read browser tabs. Grant Automation permission in System Settings.`
      )
    }
  }

  startPolling(_onChange: (track: NowPlayingTrack | null) => void): void {}

  stopPolling(): void {}
}

export const CHROME_YOUTUBE_CONFIG: BrowserYouTubeConfig = {
  id: 'chrome-youtube',
  name: 'Chrome / YouTube',
  processName: 'Google Chrome',
  appName: 'Google Chrome',
  supportsJsAppleEvents: true
}

export const ARC_YOUTUBE_CONFIG: BrowserYouTubeConfig = {
  id: 'arc-youtube',
  name: 'Arc / YouTube',
  processName: 'Arc',
  appName: 'Arc',
  supportsJsAppleEvents: true
}

export const EDGE_YOUTUBE_CONFIG: BrowserYouTubeConfig = {
  id: 'edge-youtube',
  name: 'Edge / YouTube',
  processName: 'Microsoft Edge',
  appName: 'Microsoft Edge',
  supportsJsAppleEvents: true
}

export const SAFARI_YOUTUBE_CONFIG: BrowserYouTubeConfig = {
  id: 'safari-youtube',
  name: 'Safari / YouTube',
  processName: 'Safari',
  appName: 'Safari',
  supportsJsAppleEvents: false
}
