import type { LyricsProvider } from './LyricsProvider'

export type { LyricsProvider }
export { parseLrc } from './LyricsProvider'

/**
 * Returns the ordered lyrics provider registry.
 * Phase 2 adds LocalLrcProvider; Phase 4 adds RemoteLyricsProvider.
 */
export function buildLyricsProviderRegistry(): LyricsProvider[] {
  return []
}
