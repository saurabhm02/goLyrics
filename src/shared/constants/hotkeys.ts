// Global shortcut accelerators for Electron's globalShortcut.register()
// Option key maps to "Alt" in Electron accelerator strings on macOS
export const Hotkeys = {
  TOGGLE_OVERLAY: 'Alt+L',
  REFRESH_SONG: 'Alt+Space',
  RELOAD_LYRICS: 'Alt+R',
  SYNC_EARLIER: 'Alt+Up',
  SYNC_LATER: 'Alt+Down',
  SYNC_RESET: 'Alt+0'
} as const
