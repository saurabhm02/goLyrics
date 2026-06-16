export type SongSource = 'macos' | 'spotify' | 'apple-music' | 'youtube' | 'unknown'

export interface NowPlayingTrack {
  title: string
  artist: string
  album?: string
  durationMs?: number
  positionMs?: number
  isPlaying: boolean
  source: SongSource
  providerId: string
}
