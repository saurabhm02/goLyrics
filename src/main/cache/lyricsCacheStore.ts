import { app } from 'electron'
import Store from 'electron-store'
import type { ParsedLyrics } from '../../shared/types/lyrics'

export interface CachedLyricsEntry {
  key: string
  providerId: string
  lyrics: ParsedLyrics
  fetchedAt: number
  expiresAt: number
  negative?: boolean
  /** Title of the track when lyrics were fetched (for cache validation). */
  sourceTitle?: string
  sourceArtist?: string
  /** LRCLIB (or similar) matched track name stored at fetch time. */
  matchedTrackName?: string
  matchedArtistName?: string
}

interface LyricsCacheData {
  entries: Record<string, CachedLyricsEntry>
}

let store: Store<LyricsCacheData> | null = null

function getStore(): Store<LyricsCacheData> {
  if (store) return store
  store = new Store<LyricsCacheData>({
    name: 'lyrics-cache',
    cwd: app.getPath('userData'),
    defaults: { entries: {} }
  })
  return store
}

export const LyricsCacheStore = {
  get(key: string): CachedLyricsEntry | null {
    const entry = getStore().get('entries')[key]
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.delete(key)
      return null
    }
    return entry
  },

  set(entry: CachedLyricsEntry): void {
    const entries = { ...getStore().get('entries'), [entry.key]: entry }
    getStore().set('entries', entries)
  },

  delete(key: string): void {
    const entries = { ...getStore().get('entries') }
    delete entries[key]
    getStore().set('entries', entries)
  },

  clear(): void {
    getStore().set('entries', {})
  },

  size(): number {
    return Object.keys(getStore().get('entries')).length
  }
}
