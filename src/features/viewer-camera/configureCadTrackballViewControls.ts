import type { TrackballControls } from 'three-stdlib'
import { TRACKBALL_VIEW_MOUSE_BUTTONS } from './trackballViewMouseButtons'

export type CadTrackballViewOptions = {
  enableZoom?: boolean
  dampingFactor?: number
}

/**
 * Konfiguracja Trackball pod CAD: ŚKM obrót, PPM pan, bez bezwładności.
 */
export function configureCadTrackballViewControls(
  controls: TrackballControls,
  options: CadTrackballViewOptions = {},
): TrackballControls {
  const { enableZoom = true, dampingFactor = 0.05 } = options
  controls.staticMoving = true
  controls.dynamicDampingFactor = dampingFactor
  controls.noZoom = !enableZoom
  controls.mouseButtons = { ...TRACKBALL_VIEW_MOUSE_BUTTONS }
  return controls
}
