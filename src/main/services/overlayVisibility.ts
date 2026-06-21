import type { OverlayWindowManager } from '../windows/overlayWindow'
import type { NowPlayingTrack } from '../../shared/types/song'

let overlayRef: OverlayWindowManager | null = null
let userDismissedOverlay = false
let autoShowEnabled = true

export function initOverlayVisibility(overlay: OverlayWindowManager): void {
  overlayRef = overlay
}

export function setAutoShowEnabled(enabled: boolean): void {
  autoShowEnabled = enabled
}

export function syncOverlayVisibility(track: NowPlayingTrack | null): void {
  if (!overlayRef) return

  if (overlayRef.getPanelMode() !== 'lyrics') {
    overlayRef.show()
    return
  }

  const shouldShow = Boolean(track?.isPlaying && !track?.ended)

  if (shouldShow && autoShowEnabled && !userDismissedOverlay) {
    overlayRef.show()
    return
  }

  if (!shouldShow) {
    userDismissedOverlay = false
    overlayRef.hide()
  }
}

export function toggleOverlayWithDismiss(): void {
  if (!overlayRef) return

  if (overlayRef.getState().visible) {
    userDismissedOverlay = true
    overlayRef.hide()
  } else {
    userDismissedOverlay = false
    overlayRef.show()
  }
}
