import type { SongProvider } from './SongProvider'
import type { NowPlayingTrack } from '../../shared/types/song'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const APPLE_MUSIC_SCRIPT = `
tell application "Music"
  if player state is playing then
    set trackName to name of current track
    set artistName to artist of current track
    set albumName to album of current track
    set trackDuration to duration of current track
    set trackPosition to player position
    return trackName & "||" & artistName & "||" & albumName & "||" & (trackDuration as text) & "||" & (trackPosition as text)
  end if
end tell
return ""
`

export class AppleMusicProvider implements SongProvider {
  readonly id = 'apple-music'
  readonly name = 'Apple Music'
  private warnedAboutAutomation = false

  async isAvailable(): Promise<boolean> {
    if (process.platform !== 'darwin') return false
    try {
      await execFileAsync('/usr/bin/pgrep', ['-x', 'Music'])
      return true
    } catch {
      return false
    }
  }

  async getNowPlaying(): Promise<NowPlayingTrack | null> {
    if (!(await this.isAvailable())) return null

    try {
      const { stdout } = await execFileAsync('/usr/bin/osascript', ['-e', APPLE_MUSIC_SCRIPT])
      const raw = stdout.trim()
      if (!raw) return null

      const [title, artist, album, durationRaw, positionRaw] = raw.split('||')
      if (!title?.trim() || !artist?.trim()) return null

      const durationMs = Math.round(Number(durationRaw) || 0)
      const positionMs = Math.round((Number(positionRaw) || 0) * 1000)

      return {
        title: title.trim(),
        artist: artist.trim(),
        album: album?.trim() || undefined,
        durationMs: durationMs > 0 ? durationMs : undefined,
        positionMs,
        isPlaying: true,
        source: 'apple-music',
        providerId: this.id
      }
    } catch (error) {
      if (!this.warnedAboutAutomation) {
        this.warnedAboutAutomation = true
        console.warn(
          '[AppleMusicProvider] Unable to read Music.app. Grant Automation permission for goLyrics to control Music.',
          error
        )
      }
      return null
    }
  }

  startPolling(_onChange: (track: NowPlayingTrack | null) => void): void {}

  stopPolling(): void {}
}
