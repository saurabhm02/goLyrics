import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../shared/types/ipc'
import type { OverlayState, OverlaySettings, OverlayPanelMode } from '../shared/types/settings'
import type { NowPlayingTrack } from '../shared/types/song'
import type { ActiveLines } from '../shared/types/lyrics'
import type { goLyricsAPI } from '../shared/types/api'

function on<T>(channel: string, cb: (data: T) => void): () => void {
  const handler = (_: Electron.IpcRendererEvent, data: T): void => cb(data)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: goLyricsAPI = {
  toggleOverlay: (): Promise<OverlayState> =>
    ipcRenderer.invoke(IpcChannels.OVERLAY_TOGGLE),

  getOverlayState: (): Promise<OverlayState> =>
    ipcRenderer.invoke(IpcChannels.OVERLAY_GET_STATE),

  setDragMode: (enabled: boolean): Promise<OverlayState> =>
    ipcRenderer.invoke(IpcChannels.OVERLAY_SET_DRAG_MODE, enabled),

  setClickThrough: (enabled: boolean): Promise<OverlayState> =>
    ipcRenderer.invoke(IpcChannels.OVERLAY_SET_CLICK_THROUGH, enabled),

  onOverlayStateChanged: (cb: (state: OverlayState) => void) =>
    on<OverlayState>(IpcChannels.OVERLAY_STATE_CHANGED, cb),

  getPanelMode: (): Promise<OverlayPanelMode> =>
    ipcRenderer.invoke(IpcChannels.OVERLAY_GET_PANEL_MODE),

  closePanel: (): Promise<OverlayPanelMode> =>
    ipcRenderer.invoke(IpcChannels.OVERLAY_CLOSE_PANEL),

  onPanelModeChanged: (cb: (mode: OverlayPanelMode) => void) =>
    on<OverlayPanelMode>(IpcChannels.OVERLAY_PANEL_MODE_CHANGED, cb),

  getSettings: (): Promise<OverlaySettings> =>
    ipcRenderer.invoke(IpcChannels.SETTINGS_GET),

  updateSettings: (patch: Partial<OverlaySettings>): Promise<OverlaySettings> =>
    ipcRenderer.invoke(IpcChannels.SETTINGS_UPDATE, patch),

  openSettings: (): Promise<void> => ipcRenderer.invoke(IpcChannels.SETTINGS_OPEN),

  resetOverlayPosition: (): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.SETTINGS_RESET_POSITION),

  clearLyricsCache: (): Promise<number> => ipcRenderer.invoke(IpcChannels.CACHE_CLEAR_LYRICS),

  onSettingsChanged: (cb: (settings: OverlaySettings) => void) =>
    on<OverlaySettings>(IpcChannels.SETTINGS_CHANGED, cb),

  completeOnboarding: (): Promise<void> => ipcRenderer.invoke(IpcChannels.ONBOARDING_COMPLETE),

  openSystemSettings: (pane: 'automation'): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.ONBOARDING_OPEN_SYSTEM_SETTINGS, pane),

  refreshSong: (): Promise<NowPlayingTrack | null> =>
    ipcRenderer.invoke(IpcChannels.SONG_REFRESH),

  onTrackChanged: (cb: (track: NowPlayingTrack | null) => void) =>
    on<NowPlayingTrack | null>(IpcChannels.SONG_TRACK_CHANGED, cb),

  reloadLyrics: (): Promise<boolean> => ipcRenderer.invoke(IpcChannels.LYRICS_RELOAD),

  onLyricsChanged: (cb: (lines: ActiveLines) => void) =>
    on<ActiveLines>(IpcChannels.LYRICS_LINES_CHANGED, cb)
}

contextBridge.exposeInMainWorld('goLyrics', api)
