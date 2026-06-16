import type { LyricsProvider } from './LyricsProvider'
import { YouTubeTranscriptLyricsProvider } from './YouTubeTranscriptLyricsProvider'
import { LrcLibLyricsProvider } from './LrcLibLyricsProvider'

export type { LyricsProvider }
export { parseLrc, plainLyricsToTimedLyrics } from './LyricsProvider'
export { YouTubeTranscriptLyricsProvider }
export { LrcLibLyricsProvider }


export function buildLyricsProviderRegistry(): LyricsProvider[] {
  return [new YouTubeTranscriptLyricsProvider(), new LrcLibLyricsProvider()]
}
