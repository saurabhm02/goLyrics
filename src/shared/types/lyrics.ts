export interface LrcLine {
  timeMs: number
  text: string
}

export interface ParsedLyrics {
  lines: LrcLine[]
  offsetMs?: number
  trackId?: string
}

export interface ActiveLines {
  prev: LrcLine | null
  current: LrcLine | null
  next: LrcLine | null
  currentIndex: number
}
