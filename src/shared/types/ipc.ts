import type { OverlayState, OverlaySettings, OverlayPanelMode } from './settings'
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
  OVERLAY_PANEL_MODE_CHANGED: 'overlay:panelModeChanged',
  OVERLAY_CLOSE_PANEL: 'overlay:closePanel',
  OVERLAY_GET_PANEL_MODE: 'overlay:getPanelMode',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_CHANGED: 'settings:changed',
  SETTINGS_OPEN: 'settings:open',
  SETTINGS_RESET_POSITION: 'settings:resetPosition',
  CACHE_CLEAR_LYRICS: 'cache:clearLyrics',

  // Onboarding
  ONBOARDING_COMPLETE: 'onboarding:complete',
  ONBOARDING_OPEN_SYSTEM_SETTINGS: 'onboarding:openSystemSettings',

  // Song detection (Phase 3)
  SONG_REFRESH: 'song:refresh',
  SONG_TRACK_CHANGED: 'song:trackChanged',

  // Lyrics (Phase 2)
  LYRICS_RELOAD: 'lyrics:reload',
  LYRICS_LINES_CHANGED: 'lyrics:linesChanged'
} as const

export type IpcChannelName = (typeof IpcChannels)[keyof typeof IpcChannels]

// Typed invoke/send payloads for each channel
export interface IpcInvokeMap {
  [IpcChannels.OVERLAY_TOGGLE]: { args: []; result: OverlayState }
  [IpcChannels.OVERLAY_GET_STATE]: { args: []; result: OverlayState }
  [IpcChannels.OVERLAY_SET_DRAG_MODE]: { args: [boolean]; result: OverlayState }
  [IpcChannels.OVERLAY_SET_CLICK_THROUGH]: { args: [boolean]; result: OverlayState }
  [IpcChannels.OVERLAY_CLOSE_PANEL]: { args: []; result: OverlayPanelMode }
  [IpcChannels.OVERLAY_GET_PANEL_MODE]: { args: []; result: OverlayPanelMode }
  [IpcChannels.SETTINGS_GET]: { args: []; result: OverlaySettings }
  [IpcChannels.SETTINGS_UPDATE]: { args: [Partial<OverlaySettings>]; result: OverlaySettings }
  [IpcChannels.SETTINGS_OPEN]: { args: []; result: void }
  [IpcChannels.SETTINGS_RESET_POSITION]: { args: []; result: void }
  [IpcChannels.CACHE_CLEAR_LYRICS]: { args: []; result: number }
  [IpcChannels.ONBOARDING_COMPLETE]: { args: []; result: void }
  [IpcChannels.ONBOARDING_OPEN_SYSTEM_SETTINGS]: {
    args: ['automation']
    result: void
  }
  [IpcChannels.SONG_REFRESH]: { args: []; result: NowPlayingTrack | null }
  [IpcChannels.LYRICS_RELOAD]: { args: []; result: boolean }
}

// Events pushed from main → renderer
export interface IpcEventMap {
  [IpcChannels.OVERLAY_STATE_CHANGED]: OverlayState
  [IpcChannels.OVERLAY_PANEL_MODE_CHANGED]: OverlayPanelMode
  [IpcChannels.SONG_TRACK_CHANGED]: NowPlayingTrack | null
  [IpcChannels.LYRICS_LINES_CHANGED]: ActiveLines
  [IpcChannels.SETTINGS_CHANGED]: OverlaySettings
}
