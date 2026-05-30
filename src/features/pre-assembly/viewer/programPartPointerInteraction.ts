import type { Ray, Vector3 } from 'three'
import { Plane, Vector3 as ThreeVector3 } from 'three'
import type { PhantomTransform } from '../model'
import { sceneToMm } from '../phantomUnits'

export const PROGRAM_PART_DRAG_THRESHOLD_PX = 4

export const PROGRAM_PART_ROTATE_DEG_PER_PX = 0.4

export type ProgramPartPointerMode = 'translate' | 'rotate'

export type ProgramPartPointerSession = {
  partId: string
  mode: ProgramPartPointerMode
  pointerId: number
  startClientX: number
  startClientY: number
  startTransform: PhantomTransform
  dragged: boolean
  /** Punkt przecięcia promienia z płaszczyzną dragu w mm (środek detalu na start). */
  dragPlaneHitMm: [number, number, number] | null
}

/** LKM = przesunięcie, ŚKM (kółko) = obrót detalu w montażu. */
export function programPartPointerModeFromButton(button: number): ProgramPartPointerMode | null {
  if (button === 0) return 'translate'
  if (button === 1) return 'rotate'
  return null
}

export function beginProgramPartPointerSession(input: {
  partId: string
  mode: ProgramPartPointerMode
  pointerId: number
  clientX: number
  clientY: number
  transform: PhantomTransform
  dragPlaneHitMm?: [number, number, number] | null
}): ProgramPartPointerSession {
  return {
    partId: input.partId,
    mode: input.mode,
    pointerId: input.pointerId,
    startClientX: input.clientX,
    startClientY: input.clientY,
    startTransform: {
      positionMm: [...input.transform.positionMm] as PhantomTransform['positionMm'],
      rotationDeg: [...input.transform.rotationDeg] as PhantomTransform['rotationDeg'],
    },
    dragged: false,
    dragPlaneHitMm: input.dragPlaneHitMm ?? null,
  }
}

export function pointerSessionShouldDrag(
  session: ProgramPartPointerSession,
  clientX: number,
  clientY: number,
): boolean {
  const dx = clientX - session.startClientX
  const dy = clientY - session.startClientY
  return Math.hypot(dx, dy) >= PROGRAM_PART_DRAG_THRESHOLD_PX
}

export function markProgramPartSessionDragged(
  session: ProgramPartPointerSession,
): ProgramPartPointerSession {
  return { ...session, dragged: true }
}

const scratchHit = new ThreeVector3()
const scratchNormal = new ThreeVector3()

/** Płaszczyzna przez punkt w mm, prostopadła do kierunku kamery. */
export function createProgramPartDragPlane(
  centerMm: [number, number, number],
  cameraDirection: Vector3,
): Plane {
  scratchNormal.copy(cameraDirection).normalize()
  const centerScene = new ThreeVector3(centerMm[0], centerMm[1], centerMm[2])
  return new Plane().setFromNormalAndCoplanarPoint(scratchNormal, centerScene)
}

export function intersectRayWithDragPlaneMm(
  ray: Ray,
  plane: Plane,
): [number, number, number] | null {
  if (!ray.intersectPlane(plane, scratchHit)) return null
  return [sceneToMm(scratchHit.x), sceneToMm(scratchHit.y), sceneToMm(scratchHit.z)]
}

/** Przesuwa detal: delta między punktem startowym a bieżącym na płaszczyźnie dragu. */
export function computeTranslateTransform(
  session: ProgramPartPointerSession,
  currentHitMm: [number, number, number],
): PhantomTransform {
  const anchor = session.dragPlaneHitMm ?? session.startTransform.positionMm
  const delta: [number, number, number] = [
    currentHitMm[0] - anchor[0],
    currentHitMm[1] - anchor[1],
    currentHitMm[2] - anchor[2],
  ]
  const start = session.startTransform.positionMm
  return {
    positionMm: [start[0] + delta[0], start[1] + delta[1], start[2] + delta[2]],
    rotationDeg: [...session.startTransform.rotationDeg] as PhantomTransform['rotationDeg'],
  }
}

/** Obrót wokół osi świata: X z pionowego ruchu myszy, Y z poziomego. */
export function computeRotateTransform(
  session: ProgramPartPointerSession,
  clientX: number,
  clientY: number,
): PhantomTransform {
  const dx = clientX - session.startClientX
  const dy = clientY - session.startClientY
  const start = session.startTransform.rotationDeg
  const rotX = start[0] - dy * PROGRAM_PART_ROTATE_DEG_PER_PX
  const rotY = start[1] + dx * PROGRAM_PART_ROTATE_DEG_PER_PX
  return {
    positionMm: [...session.startTransform.positionMm] as PhantomTransform['positionMm'],
    rotationDeg: [rotX, rotY, start[2]],
  }
}

export type ProgramPartPointerFinish =
  | { kind: 'click' }
  | { kind: 'drag'; transform: PhantomTransform }

export function finishProgramPartPointerSession(
  session: ProgramPartPointerSession,
  finalTransform: PhantomTransform,
): ProgramPartPointerFinish {
  if (!session.dragged) {
    return { kind: 'click' }
  }
  return { kind: 'drag', transform: finalTransform }
}
