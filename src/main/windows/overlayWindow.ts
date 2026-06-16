import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import type { OverlaySettings, OverlayState } from '../../shared/types/settings'
import { IpcChannels } from '../../shared/types/ipc'
import {
  DEFAULT_OVERLAY_BOTTOM_GAP,
  DEFAULT_OVERLAY_HEIGHT,
  getOverlayWidthForDisplay
} from '../../shared/constants/defaults'
import { SettingsStore } from '../settings/settingsStore'

const MOVE_DEBOUNCE_MS = 500
const DRAG_MODE_OVERLAY_HEIGHT = 76

export class OverlayWindowManager {
  private win: BrowserWindow | null = null
  private moveTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private settings: OverlaySettings) {}

  async create(): Promise<void> {
    let { x, y, width, height } = this.settings
    const display = screen.getDisplayNearestPoint({ x, y })
    const area = display.workArea
    const isOffscreen =
      x < area.x - width ||
      y < area.y - height ||
      x > area.x + area.width ||
      y > area.y + area.height

    if (isOffscreen) {
      const centered = this.getBottomCenterPosition(height)
      x = centered.x
      y = centered.y
      width = centered.width
      this.settings.x = x
      this.settings.y = y
      this.settings.width = width
      SettingsStore.set('x', x)
      SettingsStore.set('y', y)
      SettingsStore.set('width', width)
    }

    // Shrink legacy tall windows so lyrics sit on the bottom edge.
    if (height > 80) {
      const oldBottom = y + height
      height = DEFAULT_OVERLAY_HEIGHT
      y = oldBottom - height
      this.settings.height = height
      this.settings.y = y
      SettingsStore.set('height', height)
      SettingsStore.set('y', y)
    }

    // Full-width bottom bar keeps lyrics centered on screen.
    const { workArea } = display
    const fullWidth = getOverlayWidthForDisplay(workArea.width)
    if (width !== fullWidth || x !== workArea.x) {
      width = fullWidth
      x = workArea.x
      this.settings.width = width
      this.settings.x = x
      SettingsStore.set('width', width)
      SettingsStore.set('x', x)
    }

    this.win = new BrowserWindow({
      x,
      y,
      width,
      height,
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
      this.clampToWorkArea()
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
    this.persistCurrentBounds()
    this.setClickThrough(!enabled)
    this.settings.dragMode = enabled
    SettingsStore.set('dragMode', enabled)

    const bounds = this.win.getBounds()
    const targetHeight = enabled ? DRAG_MODE_OVERLAY_HEIGHT : DEFAULT_OVERLAY_HEIGHT
    const bottom = bounds.y + bounds.height
    const nextY = bottom - targetHeight
    this.win.setBounds({ x: bounds.x, y: nextY, width: bounds.width, height: targetHeight })
    this.settings.height = targetHeight
    this.settings.y = nextY
    SettingsStore.set('height', targetHeight)
    SettingsStore.set('y', nextY)

    if (!enabled) {
      // Capture final window position after the drag release event is committed.
      setTimeout(() => this.persistCurrentBounds(), 80)
    }
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
      this.persistCurrentBounds()
    }, MOVE_DEBOUNCE_MS)
  }

  private persistCurrentBounds(): void {
    if (!this.win || this.win.isDestroyed()) return
    const { x, y } = this.win.getBounds()
    SettingsStore.set('x', x)
    SettingsStore.set('y', y)
    this.settings.x = x
    this.settings.y = y
  }

  private getBottomCenterPosition(height = this.settings.height): { x: number; y: number; width: number } {
    const { workArea } = screen.getPrimaryDisplay()
    const width = getOverlayWidthForDisplay(workArea.width)
    return {
      x: workArea.x,
      y: Math.round(workArea.y + workArea.height - height - DEFAULT_OVERLAY_BOTTOM_GAP),
      width
    }
  }

  private clampToWorkArea(): void {
    if (!this.win || this.win.isDestroyed()) return

    const bounds = this.win.getBounds()
    const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y })
    const { workArea } = display
    let { x, y, width, height } = bounds

    const bottom = y + height
    const workBottom = workArea.y + workArea.height
    if (bottom > workBottom - DEFAULT_OVERLAY_BOTTOM_GAP) {
      y = workBottom - height - DEFAULT_OVERLAY_BOTTOM_GAP
    }
    if (y < workArea.y) {
      y = workArea.y
    }

    const minX = workArea.x
    const maxX = workArea.x + workArea.width - width
    x = Math.min(Math.max(x, minX), maxX)

    if (x !== bounds.x || y !== bounds.y) {
      this.win.setPosition(x, y)
      this.settings.x = x
      this.settings.y = y
      SettingsStore.set('x', x)
      SettingsStore.set('y', y)
    }
  }

  resetPosition(): void {
    if (!this.win) return
    const { x, y, width } = this.getBottomCenterPosition(DEFAULT_OVERLAY_HEIGHT)
    this.win.setBounds({
      x,
      y,
      width,
      height: DEFAULT_OVERLAY_HEIGHT
    })
    SettingsStore.set('x', x)
    SettingsStore.set('y', y)
    SettingsStore.set('width', width)
    SettingsStore.set('height', DEFAULT_OVERLAY_HEIGHT)
    this.settings.x = x
    this.settings.y = y
    this.settings.width = width
    this.settings.height = DEFAULT_OVERLAY_HEIGHT
  }
}
