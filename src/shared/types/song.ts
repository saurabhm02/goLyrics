export type SongSource = 'macos' | 'spotify' | 'apple-music' | 'youtube' | 'unknown'

export interface NowPlayingTrack {
  title: string
  artist: string
  album?: string
  durationMs?: number
  positionMs?: number
  sourceUrl?: string
  liveCaptionText?: string
  ended?: boolean
  isPlaying: boolean
  source: SongSource
  providerId: string
}
