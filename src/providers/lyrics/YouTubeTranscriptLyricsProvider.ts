import { YoutubeTranscript } from 'youtube-transcript'
import type { NowPlayingTrack } from '../../shared/types/song'
import type { ParsedLyrics } from '../../shared/types/lyrics'
import type { LyricsProvider } from './LyricsProvider'

function getVideoIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '') || null
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v')
    }
    return null
  } catch {
    return null
  }
}

export class YouTubeTranscriptLyricsProvider implements LyricsProvider {
  readonly id = 'youtube-transcript'
  readonly name = 'YouTube transcript'

  async fetchLyrics(track: NowPlayingTrack): Promise<ParsedLyrics | null> {
    if (track.source !== 'youtube' || !track.sourceUrl) return null
    const videoId = getVideoIdFromUrl(track.sourceUrl)
    if (!videoId) return null

    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId)
      if (!transcript.length) return null

      const lines = transcript
        .map((entry) => ({
          timeMs: Math.max(0, Math.round(entry.offset)),
          text: entry.text.trim()
        }))
        .filter((entry) => entry.text.length > 0)

      if (!lines.length) return null
      return { lines, trackId: videoId }
    } catch {
      return null
    }
  }
}
