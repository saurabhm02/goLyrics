import type { NowPlayingTrack } from '../../shared/types/song'

/**
 * Contract that all song detection providers must implement.
 * Providers are registered with SongOrchestrator and polled in order.
 */
export interface SongProvider {
  /** Unique machine-readable identifier */
  readonly id: string
  /** Human-readable display name */
  readonly name: string

  /** Returns true if this provider can work on the current machine/OS */
  isAvailable(): Promise<boolean>

  /** Returns the currently playing track, or null if nothing is playing */
  getNowPlaying(): Promise<NowPlayingTrack | null>

  /**
   * Start polling for track changes at a provider-defined interval.
   * Calls `onChange` whenever the track changes.
   */
  startPolling(onChange: (track: NowPlayingTrack | null) => void): void

  /** Stop the polling loop. Safe to call even if not polling. */
  stopPolling(): void
}
