import { app, Menu, MenuItem, Tray, nativeImage } from 'electron'
import { join } from 'path'
import type { OverlayWindowManager } from '../windows/overlayWindow'
import { SettingsStore } from '../settings/settingsStore'
import type { OverlaySettings } from '../../shared/types/settings'

let trayInstance: Tray | null = null

function buildMenu(overlay: OverlayWindowManager, settings: OverlaySettings): Menu {
  const state = overlay.getState()

  return Menu.buildFromTemplate([
    {
      label: 'LyricOverlay',
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
      label: 'Quit LyricOverlay',
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
  create(overlay: OverlayWindowManager, settings: OverlaySettings): void {
    const iconPath = join(__dirname, '../../resources/trayIconTemplate.png')
    let icon: Electron.NativeImage

    try {
      icon = nativeImage.createFromPath(iconPath)
      if (icon.isEmpty()) throw new Error('empty image')
      icon.setTemplateImage(true)
    } catch {
      // Fallback: create a minimal 1x1 template image so the tray still works
      icon = nativeImage.createEmpty()
    }

    trayInstance = new Tray(icon)
    trayInstance.setToolTip('LyricOverlay')
    trayInstance.setContextMenu(buildMenu(overlay, settings))

    // Left-click on the tray icon toggles the overlay on macOS
    trayInstance.on('click', () => {
      overlay.toggle()
      rebuildMenu(overlay, settings)
    })

    // Keep tray menu fresh when the overlay state changes
    overlay.window?.on('show', () => rebuildMenu(overlay, settings))
    overlay.window?.on('hide', () => rebuildMenu(overlay, settings))
  },

  destroy(): void {
    trayInstance?.destroy()
    trayInstance = null
  }
}
