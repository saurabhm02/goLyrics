import type { SongProvider } from './SongProvider'
import type { NowPlayingTrack } from '../../shared/types/song'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const execFileAsync = promisify(execFile)


const FALLBACK_SCRIPT = `
on run
  try
    tell application "Spotify"
      if player state is playing then
        set trackName to name of current track
        set artistName to artist of current track
        set albumName to album of current track
        set trackDuration to duration of current track
        set trackPosition to player position
        return trackName & "||" & artistName & "||" & albumName & "||" & (trackDuration as text) & "||" & (trackPosition as text) & "||1"
      end if
    end tell
  end try
  try
    tell application "Music"
      if player state is playing then
        set trackName to name of current track
        set artistName to artist of current track
        set albumName to album of current track
        set trackDuration to duration of current track
        set trackPosition to player position
        return trackName & "||" & artistName & "||" & albumName & "||" & (trackDuration as text) & "||" & (trackPosition as text) & "||1"
      end if
    end tell
  end try
  return ""
end run
`

function getHelperPath(): string | null {
  const candidates = [
    join(process.resourcesPath, 'read-now-playing'),
    join(__dirname, '../../../resources/read-now-playing'),
    join(process.cwd(), 'resources/read-now-playing')
  ]
  return candidates.find((path) => existsSync(path)) ?? null
}

function parseNowPlayingOutput(raw: string): NowPlayingTrack | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const [title, artist, album, durationRaw, positionRaw, rateRaw] = trimmed.split('||')
  if (!title?.trim()) return null

  const durationRawNum = Number(durationRaw) || 0
  const positionRawNum = Number(positionRaw) || 0
  const durationMs =
    durationRawNum > 10_000 ? Math.round(durationRawNum) : Math.round(durationRawNum * 1000)
  const positionMs =
    positionRawNum > 10_000 ? Math.round(positionRawNum) : Math.round(positionRawNum * 1000)
  const rate = Number(rateRaw)
  const hasRate = rateRaw?.trim() && Number.isFinite(rate)
  const isPlaying = hasRate ? rate > 0 : positionMs > 0

  return {
    title: title.trim(),
    artist: artist?.trim() || 'Unknown Artist',
    album: album?.trim() || undefined,
    durationMs: durationMs > 0 ? durationMs : undefined,
    positionMs: Number.isFinite(positionMs) ? positionMs : 0,
    isPlaying,
    ended: false,
    source: 'system',
    providerId: 'macos-now-playing'
  }
}

/**
 * Reads macOS system Now Playing via MediaPlayer framework helper,
 * with AppleScript fallback for Spotify/Music.
 */
export class MacOSNowPlayingProvider implements SongProvider {
  readonly id = 'macos-now-playing'
  readonly name = 'macOS Now Playing'

  async isAvailable(): Promise<boolean> {
    return process.platform === 'darwin'
  }

  async getNowPlaying(): Promise<NowPlayingTrack | null> {
    if (process.platform !== 'darwin') return null

    const helper = getHelperPath()
    if (helper) {
      try {
        const { stdout } = await execFileAsync(helper, [], { timeout: 3000 })
        const track = parseNowPlayingOutput(stdout)
        if (track) return track
      } catch {
        // fall through to AppleScript
      }
    }

    try {
      const { stdout } = await execFileAsync('/usr/bin/osascript', ['-e', FALLBACK_SCRIPT], {
        timeout: 3000
      })
      return parseNowPlayingOutput(stdout)
    } catch {
      return null
    }
  }

  startPolling(_onChange: (track: NowPlayingTrack | null) => void): void {}

  stopPolling(): void {}
}
