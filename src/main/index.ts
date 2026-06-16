import { app, globalShortcut } from 'electron'
import { SettingsStore } from './settings/settingsStore'
import { OverlayWindowManager } from './windows/overlayWindow'
import { registerIpc } from './ipc/registerIpc'
import { GlobalShortcutManager } from './hotkeys/globalShortcuts'
import { TrayManager } from './tray/trayManager'
import { SongOrchestrator } from './services/songOrchestrator'
import { LyricsOrchestrator } from './services/lyricsOrchestrator'
import { registerLifecycle } from './app/lifecycle'
import { buildSongProviderRegistry } from '../providers/songs'
import { buildLyricsProviderRegistry } from '../providers/lyrics'

// Prevents macOS from throttling the overlay when another app is fullscreen
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')

let overlay: OverlayWindowManager | null = null

async function bootstrap(): Promise<void> {
  const settings = SettingsStore.load()

  // Control Dock visibility from settings
  if (process.platform === 'darwin' && !settings.showInDock) {
    app.dock.hide()
  }

  // Build provider registries (all stubs in Phase 1)
  const songOrchestrator = new SongOrchestrator()
  songOrchestrator.register(...buildSongProviderRegistry())

  const lyricsOrchestrator = new LyricsOrchestrator()
  lyricsOrchestrator.register(...buildLyricsProviderRegistry())

  // Create overlay window
  overlay = new OverlayWindowManager(settings)
  await overlay.create()

  // Wire IPC handlers
  registerIpc(overlay, songOrchestrator, lyricsOrchestrator)

  // Register global hotkeys
  GlobalShortcutManager.register(overlay, songOrchestrator, lyricsOrchestrator)

  // Create tray icon
  TrayManager.create(overlay, settings)

  registerLifecycle(() => {
    if (!overlay?.window) {
      bootstrap()
    }
  })
}

app.whenReady().then(bootstrap).catch(console.error)

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
