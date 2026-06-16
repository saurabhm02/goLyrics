export interface OverlaySettings {
  x: number
  y: number
  width: number
  height: number
  visible: boolean
  clickThrough: boolean
  dragMode: boolean
  showInDock: boolean
  opacity: number
}

export interface OverlayState {
  visible: boolean
  clickThrough: boolean
  dragMode: boolean
  x: number
  y: number
  width: number
  height: number
  opacity: number
}
