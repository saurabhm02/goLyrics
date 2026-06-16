import type { SongProvider } from './SongProvider'
import type { NowPlayingTrack } from '../../shared/types/song'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const READ_CHROME_YOUTUBE_TAB_SCRIPT = `
tell application "Google Chrome"
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
  return ""
end tell
`

const READ_YOUTUBE_PLAYER_STATE_SCRIPT = `
tell application "Google Chrome"
  if (count of windows) = 0 then return ""
  set wi to %WINDOW_INDEX%
  set ti to %TAB_INDEX%
  set currentTab to tab ti of window wi
  set currentSeconds to execute currentTab javascript "(() => { const v = document.querySelector('video'); return v ? String(v.currentTime || 0) : ''; })();"
  set durationSeconds to execute currentTab javascript "(() => { const v = document.querySelector('video'); return v ? String(v.duration || 0) : ''; })();"
  set pausedState to execute currentTab javascript "(() => { const v = document.querySelector('video'); return v ? (v.paused ? '1' : '0') : '1'; })();"
  set endedState to execute currentTab javascript "(() => { const v = document.querySelector('video'); return v ? (v.ended ? '1' : '0') : '0'; })();"
  set liveCaption to execute currentTab javascript "(() => { const selectors = ['.ytp-caption-segment', '.captions-text span', '.ytp-caption-window-container span']; for (const sel of selectors) { const parts = Array.from(document.querySelectorAll(sel)).map(n => (n.textContent || '').trim()).filter(Boolean); if (parts.length) return parts.join(' '); } return ''; })();"
  return currentSeconds & "||" & durationSeconds & "||" & pausedState & "||" & endedState & "||" & liveCaption
end tell
`

function cleanYouTubeTitle(rawTitle: string): string {
  return rawTitle.replace(/\s*-\s*YouTube\s*$/i, '').trim()
}

/**
 * Phase 3: Scrapes the YouTube tab title from Chrome via AppleScript.
 * (`osascript -e 'tell app "Google Chrome" to get title of active tab...'`)
 * Parses "Artist - Title - YouTube" format from the window title.
 *
 * Phase 1 stub: always reports unavailable.
 */
export class ChromeYouTubeProvider implements SongProvider {
  readonly id = 'chrome-youtube'
  readonly name = 'Chrome / YouTube'
  private warnedAboutAutomation = false
  private warnedAboutJsInAppleEvents = false

  async isAvailable(): Promise<boolean> {
    if (process.platform !== 'darwin') return false
    try {
      await execFileAsync('/usr/bin/pgrep', ['-x', 'Google Chrome'])
      return true
    } catch {
      return false
    }
  }

  async getNowPlaying(): Promise<NowPlayingTrack | null> {
    try {
      const { stdout } = await execFileAsync('/usr/bin/osascript', ['-e', READ_CHROME_YOUTUBE_TAB_SCRIPT])
      const raw = stdout.trim()
      if (!raw) {
        return null
      }
      const [rawTitle, rawUrl, rawWindowIndex = '1', rawTabIndex = '1'] = raw.split('||')
      if (!rawUrl?.includes('youtube')) return null

      const title = cleanYouTubeTitle(rawTitle)
      if (!title) return null

      let positionMs = 0
      let isPlaying = true
      try {
        const playerScript = READ_YOUTUBE_PLAYER_STATE_SCRIPT.replace('%WINDOW_INDEX%', rawWindowIndex).replace(
          '%TAB_INDEX%',
          rawTabIndex
        )
        const { stdout: playerStdout } = await execFileAsync('/usr/bin/osascript', [
          '-e',
          playerScript
        ])
        const [
          rawPositionSeconds = '0',
          rawDurationSeconds = '0',
          rawPaused = '1',
          rawEnded = '0',
          rawCaption = ''
        ] = playerStdout
          .trim()
          .split('||')
        positionMs = Math.max(0, Math.round(Number.parseFloat(rawPositionSeconds) * 1000))
        const durationMs = Math.max(0, Math.round(Number.parseFloat(rawDurationSeconds) * 1000))
        isPlaying = rawPaused !== '1'
        const ended = rawEnded === '1'
        const liveCaptionText = rawCaption?.trim()

        // Best-effort parse for common "Artist - Song" style titles.
        const parts = title.split(' - ').map((part) => part.trim()).filter(Boolean)
        const artist = parts.length > 1 ? parts[0] : 'YouTube'

        return {
          title,
          artist,
          durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
          positionMs: Number.isFinite(positionMs) ? positionMs : 0,
          sourceUrl: rawUrl,
          liveCaptionText: liveCaptionText || undefined,
          ended,
          isPlaying,
          source: 'youtube',
          providerId: this.id
        }
      } catch {
        // Fallback mode still detects the song title/URL, even if Chrome blocks JS Apple events.
        // User can enable: View -> Developer -> Allow JavaScript from Apple Events.
        if (!this.warnedAboutJsInAppleEvents) {
          this.warnedAboutJsInAppleEvents = true
          console.warn(
            '[ChromeYouTubeProvider] Song detected but cannot read playback time. In Chrome enable "Allow JavaScript from Apple Events" for precise sync.'
          )
        }
      }

      // Best-effort parse for common "Artist - Song" style titles.
      const parts = title.split(' - ').map((part) => part.trim()).filter(Boolean)
      const artist = parts.length > 1 ? parts[0] : 'YouTube'

      return {
        title,
        artist,
        positionMs: Number.isFinite(positionMs) ? positionMs : 0,
        sourceUrl: rawUrl,
        ended: false,
        isPlaying,
        source: 'youtube',
        providerId: this.id
      }
    } catch {
      if (!this.warnedAboutAutomation) {
        this.warnedAboutAutomation = true
        console.warn('[ChromeYouTubeProvider] Unable to read Chrome tabs. Grant Automation permission: System Settings -> Privacy & Security -> Automation.')
      }
      return null
    }
  }

  startPolling(_onChange: (track: NowPlayingTrack | null) => void): void {}

  stopPolling(): void {}
}
