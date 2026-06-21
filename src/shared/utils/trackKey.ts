import type { NowPlayingTrack } from '../types/song'

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '') || null
    }
    const videoId = parsed.searchParams.get('v')
    return videoId || null
  } catch {
    return null
  }
}

export function buildTrackKey(track: NowPlayingTrack): string {
  if (track.sourceUrl) {
    const videoId = extractYouTubeVideoId(track.sourceUrl)
    if (videoId) {
      const titleSlug = normalize(track.title).slice(0, 120)
      return titleSlug ? `yt:${videoId}:${titleSlug}` : `yt:${videoId}`
    }
  }
  return `${track.providerId}::${normalize(track.artist)}::${normalize(track.title)}`
}

export function buildLyricsCacheKey(track: NowPlayingTrack): string {
  return buildTrackKey(track)
}
