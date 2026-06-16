import type { NowPlayingTrack } from '../../shared/types/song'
import type { SongProvider } from '../../providers/songs/SongProvider'

/**
 * Manages the list of song providers and polls them for the currently
 * playing track. Phase 3 wires real providers; Phase 1 all return null.
 */
export class SongOrchestrator {
  private providers: SongProvider[] = []
  private currentTrack: NowPlayingTrack | null = null
  private onChangeCallback: ((track: NowPlayingTrack | null) => void) | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null

  register(...providers: SongProvider[]): void {
    this.providers.push(...providers)
  }

  async refresh(): Promise<NowPlayingTrack | null> {
    for (const provider of this.providers) {
      if (!(await provider.isAvailable())) continue
      const track = await provider.getNowPlaying()
      if (track) {
        this.currentTrack = track
        return track
      }
    }
    this.currentTrack = null
    return null
  }

  startPolling(onChange: (track: NowPlayingTrack | null) => void): void {
    this.onChangeCallback = onChange
    if (this.pollTimer) clearInterval(this.pollTimer)

    const emitPolledTrack = async (): Promise<void> => {
      const track = await this.refresh()
      this.onChangeCallback?.(track)
    }

    void emitPolledTrack()
    this.pollTimer = setInterval(() => {
      void emitPolledTrack()
    }, 500)
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.onChangeCallback = null
  }

  getCurrent(): NowPlayingTrack | null {
    return this.currentTrack
  }
}
