import { MOUSE } from 'three'

/**
 * TrackballControls porównuje `event.button` do *wartości* mouseButtons.LEFT/MIDDLE/RIGHT
 * (i dopiero wtedy ustawia ROTATE/ZOOM/PAN). To odwrotnie niż OrbitControls
 * (tam button → akcja). Dlatego LEFT: MOUSE.ROTATE (=0) psuje mapowanie ŚKM.
 *
 * CAD: ŚKM = obrót, PPM = pan, LKM = bez trackballa (wybór).
 */
export const TRACKBALL_VIEW_MOUSE_BUTTONS = {
  /** event.button === 1 (ŚKM) → gałąź ROTATE w TrackballControls */
  LEFT: MOUSE.MIDDLE,
  /** wyłącz zoom przeciąganiem (kółko zostaje) */
  MIDDLE: -1 as unknown as (typeof MOUSE)['DOLLY'],
  /** event.button === 2 → PAN */
  RIGHT: MOUSE.RIGHT,
} as const
