import { app, BrowserWindow } from 'electron'
import { join } from 'path'

export type RendererPage = 'index' | 'settings' | 'onboarding'

function isDevRenderer(): boolean {
  return !app.isPackaged && Boolean(process.env['ELECTRON_RENDERER_URL'])
}

function getDevUrl(page: RendererPage): string {
  const base = process.env['ELECTRON_RENDERER_URL']!
  if (page === 'index') return base
  return `${base}/${page}.html`
}

function getProdPath(page: RendererPage): string {
  return join(__dirname, `../renderer/${page}.html`)
}

export async function loadRendererPage(win: BrowserWindow, page: RendererPage): Promise<void> {
  if (isDevRenderer()) {
    const url = getDevUrl(page)
    try {
      await win.loadURL(url)
      return
    } catch (error) {
      console.error(`[Window] Dev load failed for ${page} (${url}):`, error)
    }
  }

  const filePath = getProdPath(page)
  try {
    await win.loadFile(filePath)
  } catch (error) {
    console.error(`[Window] Production load failed for ${page} (${filePath}):`, error)
    throw error
  }
}

export function getMacPanelWindowOptions(
  title: string,
  width: number,
  height: number,
  resizable = false
): Electron.BrowserWindowConstructorOptions {
  const base: Electron.BrowserWindowConstructorOptions = {
    width,
    height,
    resizable,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    title,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  }

  if (process.platform === 'darwin') {
    return {
      ...base,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 18 },
      vibrancy: 'under-window',
      visualEffectState: 'active'
    }
  }

  return base
}
