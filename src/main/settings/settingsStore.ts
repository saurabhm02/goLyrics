import { app, screen } from 'electron'
import Store from 'electron-store'
import type { OverlaySettings } from '../../shared/types/settings'
import {
  DEFAULT_OVERLAY_SETTINGS,
  DEFAULT_OVERLAY_WIDTH,
  DEFAULT_OVERLAY_HEIGHT,
  SETTINGS_FILE_NAME,
  APP_NAME
} from '../../shared/constants/defaults'

const store = new Store<OverlaySettings>({
  name: SETTINGS_FILE_NAME,
  cwd: app.getPath('userData'),
  defaults: DEFAULT_OVERLAY_SETTINGS
})

function getDefaultBounds(): Pick<OverlaySettings, 'x' | 'y' | 'width' | 'height'> {
  const primary = screen.getPrimaryDisplay()
  const { width: sw, height: sh } = primary.workAreaSize
  const x = Math.round((sw - DEFAULT_OVERLAY_WIDTH) / 2)
  const y = Math.round(sh - DEFAULT_OVERLAY_HEIGHT - 80)
  return { x, y, width: DEFAULT_OVERLAY_WIDTH, height: DEFAULT_OVERLAY_HEIGHT }
}

export const SettingsStore = {
  load(): OverlaySettings {
    const stored = store.store

    // If position was never set (both x and y are 0), compute bottom-center
    if (stored.x === 0 && stored.y === 0) {
      const bounds = getDefaultBounds()
      store.set('x', bounds.x)
      store.set('y', bounds.y)
      return { ...stored, ...bounds }
    }

    return stored
  },

  get<K extends keyof OverlaySettings>(key: K): OverlaySettings[K] {
    return store.get(key)
  },

  set<K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]): void {
    store.set(key, value)
  },

  update(patch: Partial<OverlaySettings>): OverlaySettings {
    for (const [key, value] of Object.entries(patch)) {
      store.set(key as keyof OverlaySettings, value as OverlaySettings[keyof OverlaySettings])
    }
    return store.store
  },

  getAll(): OverlaySettings {
    return store.store
  },

  get filePath(): string {
    return store.path
  }
}

console.log(`[${APP_NAME}] Settings at: ${store.path}`)
