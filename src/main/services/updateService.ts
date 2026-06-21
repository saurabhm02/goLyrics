import { app, shell } from 'electron'
import { autoUpdater } from 'electron-updater'

let updateAvailable = false
let updateVersion: string | null = null
let menuRebuild: (() => void) | null = null

export function registerUpdateMenuRebuild(rebuild: () => void): void {
  menuRebuild = rebuild
}

export function isUpdateAvailable(): boolean {
  return updateAvailable
}

export function getUpdateVersion(): string | null {
  return updateVersion
}

export function startUpdateCheck(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    updateAvailable = true
    updateVersion = info.version
    menuRebuild?.()
    console.log(`[Updater] Update available: v${info.version}`)
  })

  autoUpdater.on('update-not-available', () => {
    updateAvailable = false
    updateVersion = null
    menuRebuild?.()
  })

  autoUpdater.on('error', (error) => {
    console.warn('[Updater] Check failed:', error.message)
  })

  void autoUpdater.checkForUpdates().catch((error: Error) => {
    console.warn('[Updater] Initial check failed:', error.message)
  })
}

export function downloadAndInstallUpdate(): void {
  void autoUpdater.downloadUpdate().then(() => {
    autoUpdater.quitAndInstall()
  })
}

export function openReleasesPage(): void {
  void shell.openExternal('https://github.com/saurabhm02/goLyrics/releases')
}
