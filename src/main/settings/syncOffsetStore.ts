import { app } from 'electron'
import Store from 'electron-store'

interface SyncOffsetData {
  offsets: Record<string, number>
}

let store: Store<SyncOffsetData> | null = null

function getStore(): Store<SyncOffsetData> {
  if (store) return store
  store = new Store<SyncOffsetData>({
    name: 'sync-offsets',
    cwd: app.getPath('userData'),
    defaults: { offsets: {} }
  })
  return store
}

export const SyncOffsetStore = {
  get(trackKey: string): number {
    return getStore().get('offsets')[trackKey] ?? 0
  },

  set(trackKey: string, offsetMs: number): void {
    const offsets = { ...getStore().get('offsets'), [trackKey]: offsetMs }
    getStore().set('offsets', offsets)
  },

  reset(trackKey: string): void {
    const offsets = { ...getStore().get('offsets') }
    delete offsets[trackKey]
    getStore().set('offsets', offsets)
  },

  getAll(): Record<string, number> {
    return getStore().get('offsets')
  }
}
