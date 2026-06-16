import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../shared/types/ipc'
import type { OverlayState, OverlaySettings } from '../shared/types/settings'
import type { NowPlayingTrack } from '../shared/types/song'
import type { ActiveLines } from '../shared/types/lyrics'
import type { goLyricsAPI } from '../shared/types/api'

function on<T>(channel: string, cb: (data: T) => void): () => void {
  const handler = (_: Electron.IpcRendererEvent, data: T): void => cb(data)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: goLyricsAPI = {
  // ---- Overlay control ----
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

  // ---- Settings ----
  getSettings: (): Promise<OverlaySettings> =>
    ipcRenderer.invoke(IpcChannels.SETTINGS_GET),

  updateSettings: (patch: Partial<OverlaySettings>): Promise<OverlaySettings> =>
    ipcRenderer.invoke(IpcChannels.SETTINGS_UPDATE, patch),

  // ---- Song detection (Phase 3) ----
  refreshSong: (): Promise<NowPlayingTrack | null> =>
    ipcRenderer.invoke(IpcChannels.SONG_REFRESH),

  onTrackChanged: (cb: (track: NowPlayingTrack | null) => void) =>
    on<NowPlayingTrack | null>(IpcChannels.SONG_TRACK_CHANGED, cb),

  // ---- Lyrics (Phase 2) ----
  reloadLyrics: (): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.LYRICS_RELOAD),

  onLyricsChanged: (cb: (lines: ActiveLines) => void) =>
    on<ActiveLines>(IpcChannels.LYRICS_LINES_CHANGED, cb),

  onLyricsTextColorChanged: (cb: (color: 'black' | 'white') => void) =>
    on<'black' | 'white'>(IpcChannels.LYRICS_TEXT_COLOR_CHANGED, cb)
}

contextBridge.exposeInMainWorld('goLyrics', api)
