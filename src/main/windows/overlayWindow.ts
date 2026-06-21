import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { loadRendererPage } from './loadRendererPage'
import type { OverlaySettings, OverlayState, SafeAreaProfile, OverlayPanelMode } from '../../shared/types/settings'
import { IpcChannels } from '../../shared/types/ipc'
import {
  DEFAULT_OVERLAY_HEIGHT,
  DEFAULT_OVERLAY_HEIGHT_DUAL_LINE,
  SAFE_AREA_BOTTOM_GAPS,
  getOverlayWidthForDisplay
} from '../../shared/constants/defaults'
import { SettingsStore } from '../settings/settingsStore'

const MOVE_DEBOUNCE_MS = 150
const DRAG_MODE_EXTRA_HEIGHT = 20
export const POSITION_NUDGE_PX = 32

export class OverlayWindowManager {
  private win: BrowserWindow | null = null
  private moveTimer: ReturnType<typeof setTimeout> | null = null
  private panelMode: OverlayPanelMode = 'lyrics'
  private savedLyricsBounds: Electron.Rectangle | null = null
  private panelCompleteCallback: (() => void) | null = null

  constructor(private settings: OverlaySettings) {}

  async create(): Promise<void> {
    const targetHeight = this.getContentHeight()
    let x = this.settings.x
    let y = this.settings.y
    let width = this.settings.width
    let height = targetHeight

    if (this.settings.useCustomPosition) {
      const display = screen.getDisplayNearestPoint({ x, y })
      const area = display.workArea
      const isOffscreen =
        x < area.x - width ||
        y < area.y - height ||
        x > area.x + area.width ||
        y > area.y + area.height

      if (isOffscreen) {
        const centered = this.getBottomCenterPosition(targetHeight)
        x = centered.x
        y = centered.y
        width = centered.width
      }
    } else {
      const { workArea } = screen.getPrimaryDisplay()
      width = getOverlayWidthForDisplay(workArea.width)
      x = workArea.x
      const bottomGap = this.getBottomGap()
      y = Math.round(workArea.y + workArea.height - height - bottomGap)
    }

    this.settings.x = x
    this.settings.y = y
    this.settings.width = width
    this.settings.height = height
    SettingsStore.set('x', x)
    SettingsStore.set('y', y)
    SettingsStore.set('width', width)
    SettingsStore.set('height', height)

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

    this.win.setAlwaysOnTop(true, 'screen-saver', 1)
    this.win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    this.win.setFullScreenable(false)

    if (this.settings.clickThrough) {
      this.win.setIgnoreMouseEvents(true, { forward: true })
    }

    this.win.on('moved', () => this.onMoved())
    this.win.on('closed', () => {
      this.win = null
    })

    if (process.env['NODE_ENV'] === 'development') {
      await loadRendererPage(this.win, 'index')
    } else {
      await this.win.loadFile(join(__dirname, '../renderer/index.html'))
    }

    this.win.once('ready-to-show', () => {
      if (!this.settings.useCustomPosition) {
        this.clampToWorkArea()
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

  setOpacity(opacity: number): void {
    this.settings.opacity = opacity
    SettingsStore.set('opacity', opacity)
    this.broadcastState()
  }

  setDualLineMode(enabled: boolean): void {
    this.settings.dualLineMode = enabled
    SettingsStore.set('dualLineMode', enabled)
    this.resizeToContentHeight()
    this.broadcastState()
  }

  setSafeAreaProfile(profile: SafeAreaProfile): void {
    this.settings.safeAreaProfile = profile
    SettingsStore.set('safeAreaProfile', profile)
    this.resetPosition()
    this.broadcastState()
  }

  setDragMode(enabled: boolean): void {
    if (!this.win) return
    if (this.moveTimer) {
      clearTimeout(this.moveTimer)
      this.moveTimer = null
    }
    this.persistCurrentBounds(true)
    this.setClickThrough(!enabled)
    this.settings.dragMode = enabled
    SettingsStore.set('dragMode', enabled)
    this.resizeToContentHeight()

    this.persistCurrentBounds(true)
    this.broadcastState()
  }

  nudgePosition(dx: number, dy: number): void {
    if (!this.win || this.win.isDestroyed()) return

    const bounds = this.win.getBounds()
    this.applyBounds({
      x: bounds.x + dx,
      y: bounds.y + dy,
      width: bounds.width,
      height: bounds.height
    })
    this.persistCurrentBounds(true)
    this.broadcastState()
  }

  getPanelMode(): OverlayPanelMode {
    return this.panelMode
  }

  async showPanel(mode: 'settings' | 'onboarding', onComplete?: () => void): Promise<void> {
    if (!this.win || this.win.isDestroyed()) return

    if (this.panelMode === 'lyrics') {
      this.savedLyricsBounds = this.win.getBounds()
    }

    this.panelMode = mode
    this.panelCompleteCallback = onComplete ?? null

    const sizes = {
      settings: { width: 780, height: 520 },
      onboarding: { width: 480, height: 540 }
    }
    const { width, height } = sizes[mode]
    const { workArea } = screen.getPrimaryDisplay()
    const x = Math.round(workArea.x + (workArea.width - width) / 2)
    const y = Math.round(workArea.y + (workArea.height - height) / 2)

    this.win.setBackgroundColor('#f2f2f7')
    this.win.setFocusable(true)
    this.win.setIgnoreMouseEvents(false)
    this.win.setAlwaysOnTop(true, 'screen-saver', 1)

    this.suppressMoveHandler = true
    this.win.setBounds({ x, y, width, height })
    this.suppressMoveHandler = false

    this.win.show()
    this.broadcastPanelMode()
  }

  closePanel(): void {
    if (this.panelMode === 'lyrics') return

    const callback = this.panelCompleteCallback
    this.panelCompleteCallback = null
    this.restoreLyricsPanel()
    callback?.()
  }

  private restoreLyricsPanel(): void {
    if (!this.win || this.win.isDestroyed()) return

    this.panelMode = 'lyrics'
    this.win.setBackgroundColor('#00000000')
    this.win.setFocusable(false)

    if (this.savedLyricsBounds) {
      this.suppressMoveHandler = true
      this.win.setBounds(this.savedLyricsBounds)
      this.settings.x = this.savedLyricsBounds.x
      this.settings.y = this.savedLyricsBounds.y
      this.settings.width = this.savedLyricsBounds.width
      this.settings.height = this.savedLyricsBounds.height
      SettingsStore.set('x', this.savedLyricsBounds.x)
      SettingsStore.set('y', this.savedLyricsBounds.y)
      SettingsStore.set('width', this.savedLyricsBounds.width)
      SettingsStore.set('height', this.savedLyricsBounds.height)
      this.savedLyricsBounds = null
      this.suppressMoveHandler = false
    }

    if (this.settings.dragMode) {
      this.win.setIgnoreMouseEvents(false)
    } else {
      this.win.setIgnoreMouseEvents(true, { forward: true })
    }

    this.broadcastPanelMode()
  }

  private broadcastPanelMode(): void {
    if (!this.win || this.win.isDestroyed()) return
    this.win.webContents.send(IpcChannels.OVERLAY_PANEL_MODE_CHANGED, this.panelMode)
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
      opacity: this.settings.opacity,
      fontSizePx: this.settings.fontSizePx,
      fontPreset: this.settings.fontPreset,
      dualLineMode: this.settings.dualLineMode
    }
  }

  broadcastState(): void {
    if (!this.win || this.win.isDestroyed()) return
    this.win.webContents.send(IpcChannels.OVERLAY_STATE_CHANGED, this.getState())
  }

  get window(): BrowserWindow | null {
    return this.win
  }

  private getBottomGap(): number {
    return SAFE_AREA_BOTTOM_GAPS[this.settings.safeAreaProfile] ?? SAFE_AREA_BOTTOM_GAPS.dock
  }

  private getContentHeight(): number {
    const base = this.settings.dualLineMode ? DEFAULT_OVERLAY_HEIGHT_DUAL_LINE : DEFAULT_OVERLAY_HEIGHT
    return this.settings.dragMode ? base + DRAG_MODE_EXTRA_HEIGHT : base
  }

  private resizeToContentHeight(): void {
    if (!this.win || this.win.isDestroyed()) return
    const bounds = this.win.getBounds()
    const targetHeight = this.getContentHeight()
    this.applyBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: targetHeight
    })
  }

  private onMoved(): void {
    if (this.suppressMoveHandler) return
    if (this.moveTimer) clearTimeout(this.moveTimer)
    this.moveTimer = setTimeout(() => {
      this.persistCurrentBounds(true)
    }, MOVE_DEBOUNCE_MS)
  }

  private suppressMoveHandler = false

  private applyBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    if (!this.win || this.win.isDestroyed()) return

    this.suppressMoveHandler = true
    this.win.setBounds(bounds)
    this.clampToWorkArea()
    const applied = this.win.getBounds()
    this.settings.x = applied.x
    this.settings.y = applied.y
    this.settings.width = applied.width
    this.settings.height = applied.height
    SettingsStore.set('x', applied.x)
    SettingsStore.set('y', applied.y)
    SettingsStore.set('width', applied.width)
    SettingsStore.set('height', applied.height)
    this.suppressMoveHandler = false
  }

  private markCustomPosition(): void {
    this.settings.useCustomPosition = true
    SettingsStore.set('useCustomPosition', true)
  }

  private persistCurrentBounds(markCustom = false): void {
    if (!this.win || this.win.isDestroyed()) return
    const { x, y, width, height } = this.win.getBounds()
    SettingsStore.set('x', x)
    SettingsStore.set('y', y)
    SettingsStore.set('width', width)
    SettingsStore.set('height', height)
    this.settings.x = x
    this.settings.y = y
    this.settings.width = width
    this.settings.height = height
    if (markCustom) {
      this.markCustomPosition()
    }
  }

  private getBottomCenterPosition(height = this.getContentHeight()): { x: number; y: number; width: number } {
    const { workArea } = screen.getPrimaryDisplay()
    const width = getOverlayWidthForDisplay(workArea.width)
    return {
      x: workArea.x,
      y: Math.round(workArea.y + workArea.height - height - this.getBottomGap()),
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
    const bottomGap = this.getBottomGap()
    const maxBottom = workBottom - bottomGap
    if (bottom > maxBottom) {
      y = maxBottom - height
    }
    if (y < workArea.y) {
      y = workArea.y
    }
    if (y + height > maxBottom) {
      y = maxBottom - height
    }

    const minX = workArea.x
    const maxX = workArea.x + workArea.width - width
    x = Math.min(Math.max(x, minX), maxX)

    if (x !== bounds.x || y !== bounds.y) {
      this.win.setBounds({ x, y, width, height })
      this.settings.x = x
      this.settings.y = y
      SettingsStore.set('x', x)
      SettingsStore.set('y', y)
    }
  }

  resetPosition(): void {
    if (!this.win) return
    const height = this.getContentHeight()
    const { x, y, width } = this.getBottomCenterPosition(height)
    this.applyBounds({ x, y, width, height })
    SettingsStore.set('x', x)
    SettingsStore.set('y', y)
    SettingsStore.set('width', width)
    SettingsStore.set('height', height)
    SettingsStore.set('useCustomPosition', false)
    this.settings.x = x
    this.settings.y = y
    this.settings.width = width
    this.settings.height = height
    this.settings.useCustomPosition = false
    this.broadcastState()
  }
}
