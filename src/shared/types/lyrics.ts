export interface LrcWord {
  timeMs: number
  text: string
}

export interface LrcLine {
  timeMs: number
  text: string
  words?: LrcWord[]
}

export interface LyricsMatchMeta {
  matchedTrackName: string
  matchedArtistName?: string
  providerId: string
}

export interface ParsedLyrics {
  lines: LrcLine[]
  offsetMs?: number
  trackId?: string
  matchMeta?: LyricsMatchMeta
}

export interface ActiveLines {
  prev: LrcLine | null
  current: LrcLine | null
  next: LrcLine | null
  currentIndex: number
  activeWordIndex: number
}
