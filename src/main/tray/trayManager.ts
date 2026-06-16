import { app, Menu, MenuItem, Tray, nativeImage } from 'electron'
import type { OverlayWindowManager } from '../windows/overlayWindow'
import { SettingsStore } from '../settings/settingsStore'
import type { OverlaySettings } from '../../shared/types/settings'
import { APP_LOGO_URL } from '../../shared/constants/defaults'

let trayInstance: Tray | null = null

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

function buildMenu(overlay: OverlayWindowManager, settings: OverlaySettings): Menu {
  const state = overlay.getState()

  return Menu.buildFromTemplate([
    {
      label: 'goLyrics',
      enabled: false
    },
    { type: 'separator' },
    {
      label: state.visible ? 'Hide Overlay' : 'Show Overlay',
      accelerator: 'Option+L',
      click: () => {
        overlay.toggle()
        rebuildMenu(overlay, settings)
      }
    },
    {
      label: 'Toggle Drag Mode',
      type: 'checkbox',
      checked: state.dragMode,
      click: (item: MenuItem) => {
        overlay.setDragMode(item.checked)
        rebuildMenu(overlay, settings)
      }
    },
    {
      label: 'Click-Through',
      type: 'checkbox',
      checked: state.clickThrough,
      click: (item: MenuItem) => {
        overlay.setClickThrough(item.checked)
        rebuildMenu(overlay, settings)
      }
    },
    {
      label: 'Reset Position',
      click: () => {
        overlay.resetPosition()
      }
    },
    { type: 'separator' },
    {
      label: 'Show in Dock',
      type: 'checkbox',
      checked: settings.showInDock,
      click: (item: MenuItem) => {
        settings.showInDock = item.checked
        SettingsStore.set('showInDock', item.checked)
        if (item.checked) {
          app.dock.show()
        } else {
          app.dock.hide()
        }
        rebuildMenu(overlay, settings)
      }
    },
    { type: 'separator' },
    {
      label: 'Quit goLyrics',
      accelerator: 'Command+Q',
      click: () => app.quit()
    }
  ])
}

function rebuildMenu(overlay: OverlayWindowManager, settings: OverlaySettings): void {
  if (!trayInstance) return
  trayInstance.setContextMenu(buildMenu(overlay, settings))
}

export const TrayManager = {
  async create(overlay: OverlayWindowManager, settings: OverlaySettings): Promise<void> {
    const icon = await loadTrayIcon()

    trayInstance = new Tray(icon)
    trayInstance.setToolTip('goLyrics')
    trayInstance.setContextMenu(buildMenu(overlay, settings))

    trayInstance.on('click', () => {
      overlay.toggle()
      rebuildMenu(overlay, settings)
    })

    overlay.window?.on('show', () => rebuildMenu(overlay, settings))
    overlay.window?.on('hide', () => rebuildMenu(overlay, settings))
  },

  destroy(): void {
    trayInstance?.destroy()
    trayInstance = null
  }
}
