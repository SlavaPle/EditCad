import { Vector3, type BufferGeometry, type Camera, type Mesh, type Object3D } from 'three'
import { resolveProximityPick } from '../model-selection/proximityPick'
import type { ModelSelectionProximityFilter } from '../model-selection/types'
import { captureMatePlane } from './captureMatePlane'
import type { MatePlaneRef } from './model'
import type { MatesPickSlot } from './matesPickMode'

export const MATE_PLANE_PICK_FILTER: ModelSelectionProximityFilter = {
  facePlane: true,
  edgeLine: false,
  vertex: false,
}

export type PickMatePlaneAtPointerInput = {
  partId: string
  geometry: BufferGeometry
  mesh: Mesh
  worldPoint: Vector3
  faceIndex: number | null | undefined
  pickSlot: MatesPickSlot | null
  pointerButton: number
  camera: Camera
  pointer: { x: number; y: number }
  viewport: { width: number; height: number }
}

export type PickMatePlaneAtPointerReason =
  | 'noSlot'
  | 'wrongButton'
  | 'noFaceIndex'
  | 'noFaces'
  | 'captureFailed'

export type PickMatePlaneAtPointerResult =
  | { ok: true; slot: MatesPickSlot; plane: MatePlaneRef }
  | { ok: false; reason: PickMatePlaneAtPointerReason }

/** Ref ma pierwszeństwo — omija opóźnione propsy R3F Canvas. */
export function resolveActiveMatesPickSlot(
  refSlot: MatesPickSlot | null | undefined,
  modeSlot: MatesPickSlot | null,
): MatesPickSlot | null {
  return refSlot ?? modeSlot
}

/** Bezpieczne przełączanie slotu (bez functional updater — Strict Mode). */
export function toggleMatesPickSlot(
  current: MatesPickSlot | null,
  slot: MatesPickSlot,
): MatesPickSlot | null {
  return current === slot ? null : slot
}

export function shouldBeginMatePlanePick(
  refSlot: MatesPickSlot | null | undefined,
  hasGeometry: boolean,
): boolean {
  return refSlot != null && hasGeometry
}

export function meshBuiltinFacePickOnPointerDown(
  allowFacePick: boolean,
  matesPickContextActive: boolean,
): boolean {
  return allowFacePick && !matesPickContextActive
}

const scratchLocal = new Vector3()

export function pickMatePlaneAtPointer(
  input: PickMatePlaneAtPointerInput,
): PickMatePlaneAtPointerResult {
  const { partId, geometry, mesh, worldPoint, faceIndex, pickSlot, pointerButton, camera, pointer, viewport } =
    input

  if (!pickSlot) {
    return { ok: false, reason: 'noSlot' }
  }
  if (pointerButton !== 0) {
    return { ok: false, reason: 'wrongButton' }
  }
  if (typeof faceIndex !== 'number') {
    return { ok: false, reason: 'noFaceIndex' }
  }

  mesh.worldToLocal(scratchLocal.copy(worldPoint))
  const pick = resolveProximityPick(geometry, faceIndex, scratchLocal, MATE_PLANE_PICK_FILTER, {
    camera,
    mesh: mesh as Object3D,
    pointer,
    viewport,
  })
  if (pick.type !== 'faces' || pick.indices.length === 0) {
    return { ok: false, reason: 'noFaces' }
  }

  const captured = captureMatePlane(partId, geometry, pick.indices[0]!)
  if (!captured.ok) {
    return { ok: false, reason: 'captureFailed' }
  }

  return { ok: true, slot: pickSlot, plane: captured.plane }
}
