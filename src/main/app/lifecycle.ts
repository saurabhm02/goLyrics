import { app } from 'electron'

/**
 * Registers macOS app lifecycle event handlers.
 * Called once from main/index.ts after app.whenReady().
 */
export function registerLifecycle(onActivate: () => void): void {
  // On macOS, re-create the window when dock icon is clicked and no windows exist
  app.on('activate', onActivate)

  // Quit when all windows are closed (non-macOS default)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
    // On macOS, the tray keeps the app running — don't quit here
  })
}
