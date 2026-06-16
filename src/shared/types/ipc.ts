import type { OverlayState, OverlaySettings } from './settings'
import type { NowPlayingTrack } from './song'
import type { ActiveLines } from './lyrics'

// IPC channel names — single source of truth used by both main and preload
export const IpcChannels = {
  // Overlay window control
  OVERLAY_TOGGLE: 'overlay:toggle',
  OVERLAY_GET_STATE: 'overlay:getState',
  OVERLAY_SET_DRAG_MODE: 'overlay:setDragMode',
  OVERLAY_SET_CLICK_THROUGH: 'overlay:setClickThrough',
  OVERLAY_STATE_CHANGED: 'overlay:stateChanged',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // Song detection (Phase 3)
  SONG_REFRESH: 'song:refresh',
  SONG_TRACK_CHANGED: 'song:trackChanged',

  // Lyrics (Phase 2)
  LYRICS_RELOAD: 'lyrics:reload',
  LYRICS_LINES_CHANGED: 'lyrics:linesChanged',
  LYRICS_TEXT_COLOR_CHANGED: 'lyrics:textColorChanged'
} as const

export type IpcChannelName = (typeof IpcChannels)[keyof typeof IpcChannels]

// Typed invoke/send payloads for each channel
export interface IpcInvokeMap {
  [IpcChannels.OVERLAY_TOGGLE]: { args: []; result: OverlayState }
  [IpcChannels.OVERLAY_GET_STATE]: { args: []; result: OverlayState }
  [IpcChannels.OVERLAY_SET_DRAG_MODE]: { args: [boolean]; result: OverlayState }
  [IpcChannels.OVERLAY_SET_CLICK_THROUGH]: { args: [boolean]; result: OverlayState }
  [IpcChannels.SETTINGS_GET]: { args: []; result: OverlaySettings }
  [IpcChannels.SETTINGS_UPDATE]: { args: [Partial<OverlaySettings>]; result: OverlaySettings }
  [IpcChannels.SONG_REFRESH]: { args: []; result: NowPlayingTrack | null }
  [IpcChannels.LYRICS_RELOAD]: { args: []; result: boolean }
}

// Events pushed from main → renderer
export interface IpcEventMap {
  [IpcChannels.OVERLAY_STATE_CHANGED]: OverlayState
  [IpcChannels.SONG_TRACK_CHANGED]: NowPlayingTrack | null
  [IpcChannels.LYRICS_LINES_CHANGED]: ActiveLines
  [IpcChannels.LYRICS_TEXT_COLOR_CHANGED]: 'black' | 'white'
}
