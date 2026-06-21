import type { NowPlayingTrack } from '../../shared/types/song'
import type { SongProvider } from '../../providers/songs/SongProvider'
import { sessionLog } from '../debug/sessionLog'

const AVAILABILITY_CACHE_TTL_MS = 30_000

/**
 * Manages the list of song providers and polls them for the currently playing track.
 */
export class SongOrchestrator {
  private providers: SongProvider[] = []
  private enabledProviderIds = new Set<string>()
  private currentTrack: NowPlayingTrack | null = null
  private onChangeCallback: ((track: NowPlayingTrack | null) => void) | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private availabilityCache = new Map<string, { available: boolean; checkedAt: number }>()

  register(...providers: SongProvider[]): void {
    this.providers.push(...providers)
  }

  setEnabledProviderIds(ids: string[]): void {
    this.enabledProviderIds = new Set(ids)
    this.availabilityCache.clear()
    console.log(`[SongOrchestrator] Enabled providers: ${ids.length} (${ids.join(', ')})`)
  }

  private async isProviderAvailable(provider: SongProvider): Promise<boolean> {
    const cached = this.availabilityCache.get(provider.id)
    const now = Date.now()
    if (cached && now - cached.checkedAt < AVAILABILITY_CACHE_TTL_MS) {
      return cached.available
    }

    const available = await provider.isAvailable()
    this.availabilityCache.set(provider.id, { available, checkedAt: now })
    return available
  }

  async refresh(): Promise<NowPlayingTrack | null> {
    const candidates: NowPlayingTrack[] = []

    for (const provider of this.providers) {
      if (!this.enabledProviderIds.has(provider.id)) continue
      if (!(await this.isProviderAvailable(provider))) continue
      const track = await provider.getNowPlaying()
      if (track) candidates.push(track)
    }

    const playing = candidates.find((track) => track.isPlaying && !track.ended)
    const track = playing ?? candidates[0] ?? null
    // #region agent log
    if (track) {
      sessionLog(
        'songOrchestrator.ts:refresh',
        'selected track from candidates',
        {
          selected: {
            title: track.title,
            providerId: track.providerId,
            sourceUrl: track.sourceUrl ?? null,
            isPlaying: track.isPlaying
          },
          candidateCount: candidates.length,
          candidates: candidates.map((c) => ({
            title: c.title,
            providerId: c.providerId,
            sourceUrl: c.sourceUrl ?? null,
            isPlaying: c.isPlaying
          }))
        },
        'H2'
      )
    }
    // #endregion
    this.currentTrack = track
    return track
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
