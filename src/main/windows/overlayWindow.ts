import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import type { OverlaySettings, OverlayState } from '../../shared/types/settings'
import { IpcChannels } from '../../shared/types/ipc'
import { SettingsStore } from '../settings/settingsStore'

const MOVE_DEBOUNCE_MS = 500

export class OverlayWindowManager {
  private win: BrowserWindow | null = null
  private moveTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private settings: OverlaySettings) {}

  async create(): Promise<void> {
    const { x, y, width, height } = this.settings

    this.win = new BrowserWindow({
      x,
      y,
      width,
      height,
      // Panel type is critical: it appears above fullscreen apps on macOS
      type: 'panel',
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      // focusable: false keeps the overlay from stealing focus when clicked in drag mode
      focusable: false,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false
      }
    })

    // Highest always-on-top level: appears above fullscreen apps including video players
    this.win.setAlwaysOnTop(true, 'screen-saver', 1)
    // Visible on all macOS Spaces and above full-screen apps
    this.win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    // Prevent Cmd+W or accidental fullscreen
    this.win.setFullScreenable(false)

    if (this.settings.clickThrough) {
      this.win.setIgnoreMouseEvents(true, { forward: true })
    }

    this.win.on('moved', () => this.onMoved())
    this.win.on('closed', () => {
      this.win = null
    })

    if (process.env['NODE_ENV'] === 'development') {
      this.win.loadURL(process.env['ELECTRON_RENDERER_URL']!)
    } else {
      this.win.loadFile(join(__dirname, '../renderer/index.html'))
    }

    this.win.once('ready-to-show', () => {
      if (this.settings.visible) {
        this.win?.show()
      }
    })
  }

  show(): void {
    if (!this.win) return
    this.win.show()
    SettingsStore.set('visible', true)
    this.settings.visible = true
    this.broadcastState()
  }

  hide(): void {
    if (!this.win) return
    this.win.hide()
    SettingsStore.set('visible', false)
    this.settings.visible = false
    this.broadcastState()
  }

  toggle(): void {
    if (!this.win) return
    if (this.win.isVisible()) {
      this.hide()
    } else {
      this.show()
    }
  }

  setClickThrough(enabled: boolean): void {
    if (!this.win) return
    this.win.setIgnoreMouseEvents(enabled, { forward: true })
    this.settings.clickThrough = enabled
    SettingsStore.set('clickThrough', enabled)
    this.broadcastState()
  }

  setDragMode(enabled: boolean): void {
    if (!this.win) return
    // In drag mode, the window must receive mouse events to be draggable
    this.setClickThrough(!enabled)
    this.settings.dragMode = enabled
    SettingsStore.set('dragMode', enabled)
    this.broadcastState()
  }

  getState(): OverlayState {
    const bounds = this.win?.getBounds() ?? {
      x: this.settings.x,
      y: this.settings.y,
      width: this.settings.width,
      height: this.settings.height
    }

    return {
      visible: this.win?.isVisible() ?? false,
      clickThrough: this.settings.clickThrough,
      dragMode: this.settings.dragMode,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      opacity: this.settings.opacity
    }
  }

  broadcastState(): void {
    if (!this.win || this.win.isDestroyed()) return
    this.win.webContents.send(IpcChannels.OVERLAY_STATE_CHANGED, this.getState())
  }

  get window(): BrowserWindow | null {
    return this.win
  }

  private onMoved(): void {
    if (this.moveTimer) clearTimeout(this.moveTimer)
    this.moveTimer = setTimeout(() => {
      if (!this.win || this.win.isDestroyed()) return
      const { x, y } = this.win.getBounds()
      SettingsStore.set('x', x)
      SettingsStore.set('y', y)
      this.settings.x = x
      this.settings.y = y
    }, MOVE_DEBOUNCE_MS)
  }

  private centerOnPrimaryDisplay(): { x: number; y: number } {
    const { workAreaSize } = screen.getPrimaryDisplay()
    return {
      x: Math.round((workAreaSize.width - this.settings.width) / 2),
      y: Math.round(workAreaSize.height - this.settings.height - 80)
    }
  }

  resetPosition(): void {
    if (!this.win) return
    const { x, y } = this.centerOnPrimaryDisplay()
    this.win.setPosition(x, y)
    SettingsStore.set('x', x)
    SettingsStore.set('y', y)
    this.settings.x = x
    this.settings.y = y
  }
}
