import { app, screen } from 'electron'
import Store from 'electron-store'
import type { OverlaySettings } from '../../shared/types/settings'
import {
  DEFAULT_OVERLAY_SETTINGS,
  DEFAULT_OVERLAY_HEIGHT,
  DEFAULT_OVERLAY_BOTTOM_GAP,
  getOverlayWidthForDisplay,
  SETTINGS_FILE_NAME,
  APP_NAME
} from '../../shared/constants/defaults'
import { mergeWithDefaults } from './mergeDefaults'

let store: Store<OverlaySettings> | null = null

function getStore(): Store<OverlaySettings> {
  if (store) return store
  store = new Store<OverlaySettings>({
    name: SETTINGS_FILE_NAME,
    cwd: app.getPath('userData'),
    defaults: DEFAULT_OVERLAY_SETTINGS
  })
  return store
}

function getDefaultBounds(): Pick<OverlaySettings, 'x' | 'y' | 'width' | 'height'> {
  const { workArea } = screen.getPrimaryDisplay()
  const width = getOverlayWidthForDisplay(workArea.width)
  const x = workArea.x
  const y = Math.round(
    workArea.y + workArea.height - DEFAULT_OVERLAY_HEIGHT - DEFAULT_OVERLAY_BOTTOM_GAP
  )
  return { x, y, width, height: DEFAULT_OVERLAY_HEIGHT }
}

export const SettingsStore = {
  load(): OverlaySettings {
    const currentStore = getStore()
    const stored = mergeWithDefaults(currentStore.store)

    if (stored.x === 0 && stored.y === 0) {
      const bounds = getDefaultBounds()
      currentStore.set('x', bounds.x)
      currentStore.set('y', bounds.y)
      return { ...stored, ...bounds }
    }

    return stored
  },

  get<K extends keyof OverlaySettings>(key: K): OverlaySettings[K] {
    return getStore().get(key)
  },

  set<K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]): void {
    getStore().set(key, value)
  },

  update(patch: Partial<OverlaySettings>): OverlaySettings {
    const currentStore = getStore()
    for (const [key, value] of Object.entries(patch)) {
      currentStore.set(key as keyof OverlaySettings, value as OverlaySettings[keyof OverlaySettings])
    }
    return mergeWithDefaults(currentStore.store)
  },

  getAll(): OverlaySettings {
    return mergeWithDefaults(getStore().store)
  },

  get filePath(): string {
    return getStore().path
  }
}

console.log(`[${APP_NAME}] Settings store initialized for ${APP_NAME}`)
