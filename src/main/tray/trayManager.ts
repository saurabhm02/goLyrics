import { app, Menu, MenuItem, Tray, nativeImage } from 'electron'
import type { OverlayWindowManager } from '../windows/overlayWindow'
import { POSITION_NUDGE_PX } from '../windows/overlayWindow'
import { SettingsStore } from '../settings/settingsStore'
import type { OverlaySettings, LyricsScriptMode } from '../../shared/types/settings'
import { APP_LOGO_URL } from '../../shared/constants/defaults'
import {
  downloadAndInstallUpdate,
  getUpdateVersion,
  isUpdateAvailable,
  openReleasesPage,
  registerUpdateMenuRebuild
} from '../services/updateService'
import { toggleOverlayWithDismiss } from '../services/overlayVisibility'

let trayInstance: Tray | null = null

interface TrayActions {
  openSettings: () => void
  openOnboarding: () => void
  updateSettings: (patch: Partial<OverlaySettings>) => void
}

function setLyricsScriptMode(
  mode: LyricsScriptMode,
  overlay: OverlayWindowManager,
  settings: OverlaySettings,
  actions: TrayActions
): void {
  actions.updateSettings({ lyricsScriptMode: mode })
  settings.lyricsScriptMode = mode
  rebuildMenu(overlay, settings, actions)
}

function prepareTrayIcon(image: Electron.NativeImage): Electron.NativeImage {
  return image.resize({ width: 40, height: 25 })
}

async function loadTrayIcon(): Promise<Electron.NativeImage> {
  try {
    const response = await fetch(APP_LOGO_URL)
    if (!response.ok) throw new Error(`logo fetch failed: ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    let icon = nativeImage.createFromBuffer(buffer)
    if (icon.isEmpty()) throw new Error('empty image')
    icon = prepareTrayIcon(icon)
    icon.setTemplateImage(false)
    return icon
  } catch {
    return nativeImage.createEmpty()
  }
}

function buildMenu(
  overlay: OverlayWindowManager,
  settings: OverlaySettings,
  actions: TrayActions
): Menu {
  const state = overlay.getState()
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: 'goLyrics', enabled: false },
    { type: 'separator' },
    {
      label: state.visible ? 'Hide Overlay' : 'Show Overlay',
      accelerator: 'Option+L',
      click: () => {
        toggleOverlayWithDismiss()
        rebuildMenu(overlay, settings, actions)
      }
    },
    {
      label: 'Settings…',
      click: () => actions.openSettings()
    },
    {
      label: 'Setup Permissions…',
      click: () => actions.openOnboarding()
    }
  ]

  if (isUpdateAvailable()) {
    template.push({
      label: `Download Update (v${getUpdateVersion() ?? ''})`.trim(),
      click: () => downloadAndInstallUpdate()
    })
  } else if (app.isPackaged) {
    template.push({
      label: 'Check for Updates…',
      click: () => openReleasesPage()
    })
  }

  template.push(
    {
      label: 'Toggle Drag Mode',
      type: 'checkbox',
      checked: state.dragMode,
      click: () => {
        overlay.setDragMode(!overlay.getState().dragMode)
        rebuildMenu(overlay, settings, actions)
      }
    },
    {
      label: 'Lyrics Script',
      submenu: [
        {
          label: 'Romanized (Latin / Hinglish)',
          type: 'radio',
          checked: settings.lyricsScriptMode !== 'original',
          click: () => setLyricsScriptMode('romanized', overlay, settings, actions)
        },
        {
          label: 'Original Script',
          type: 'radio',
          checked: settings.lyricsScriptMode === 'original',
          click: () => setLyricsScriptMode('original', overlay, settings, actions)
        }
      ]
    },
    {
      label: 'Position',
      submenu: [
        {
          label: 'Move Left',
          click: () => {
            overlay.nudgePosition(-POSITION_NUDGE_PX, 0)
            rebuildMenu(overlay, settings, actions)
          }
        },
        {
          label: 'Move Right',
          click: () => {
            overlay.nudgePosition(POSITION_NUDGE_PX, 0)
            rebuildMenu(overlay, settings, actions)
          }
        },
        {
          label: 'Move Up',
          click: () => {
            overlay.nudgePosition(0, -POSITION_NUDGE_PX)
            rebuildMenu(overlay, settings, actions)
          }
        },
        {
          label: 'Move Down',
          click: () => {
            overlay.nudgePosition(0, POSITION_NUDGE_PX)
            rebuildMenu(overlay, settings, actions)
          }
        },
        { type: 'separator' },
        {
          label: 'Reset to Bottom (default)',
          click: () => {
            overlay.resetPosition()
            rebuildMenu(overlay, settings, actions)
          }
        }
      ]
    },
    {
      label: 'Click-Through',
      type: 'checkbox',
      checked: state.clickThrough,
      click: (item) => {
        overlay.setClickThrough((item as MenuItem).checked)
        rebuildMenu(overlay, settings, actions)
      }
    },
    {
      label: 'Show in Dock',
      type: 'checkbox',
      checked: settings.showInDock,
      click: (item) => {
        settings.showInDock = (item as MenuItem).checked
        SettingsStore.set('showInDock', settings.showInDock)
        if (settings.showInDock) {
          app.dock.show()
        } else {
          app.dock.hide()
        }
        rebuildMenu(overlay, settings, actions)
      }
    },
    { type: 'separator' },
    {
      label: 'Quit goLyrics',
      accelerator: 'Command+Q',
      click: () => app.quit()
    }
  )

  return Menu.buildFromTemplate(template)
}

function rebuildMenu(
  overlay: OverlayWindowManager,
  settings: OverlaySettings,
  actions: TrayActions
): void {
  if (!trayInstance) return
  trayInstance.setContextMenu(buildMenu(overlay, settings, actions))
}

export const TrayManager = {
  async create(
    overlay: OverlayWindowManager,
    settings: OverlaySettings,
    actions: TrayActions
  ): Promise<void> {
    const icon = await loadTrayIcon()

    trayInstance = new Tray(icon)
    trayInstance.setToolTip('goLyrics')
    trayInstance.setIgnoreDoubleClickEvents(true)

    registerUpdateMenuRebuild(() => rebuildMenu(overlay, settings, actions))
    trayInstance.setContextMenu(buildMenu(overlay, settings, actions))

    trayInstance.on('click', () => {
      trayInstance?.popUpContextMenu()
    })

    overlay.window?.on('show', () => rebuildMenu(overlay, settings, actions))
    overlay.window?.on('hide', () => rebuildMenu(overlay, settings, actions))
  },

  destroy(): void {
    trayInstance?.destroy()
    trayInstance = null
  }
}
