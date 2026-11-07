import { Vector3, type Object3D } from 'three'
import { getCoplanarConnectedFaces } from '../model-selection/facePlaneSelection'
import { resolveProximityPick } from '../model-selection/proximityPick'
import type { ModelSelectionProximityFilter } from '../model-selection/types'
import { captureMateCurvedPlane } from './captureMateCurvedPlane'
import { captureMateEllipse, captureMateEllipseFromVertex } from './captureMateEllipse'
import { captureMateEllipseCenterAtLocalPoint } from './captureMateEllipseCenter'
import { captureMateLine } from './captureMateLine'
import { captureMatePlane } from './captureMatePlane'
import { captureMateVertex } from './captureMateVertex'
import type { MateEntityRef } from './model'
import type { MatesPickSlot } from './matesPickMode'
import {
  pickMatePlaneAtPointer,
  meshBuiltinFacePickOnPointerDown,
  resolveActiveMatesPickSlot,
  shouldBeginMatePlanePick,
  type PickMatePlaneAtPointerInput,
  type PickMatePlaneAtPointerReason,
} from './pickMatePlaneAtPointer'

export {
  meshBuiltinFacePickOnPointerDown,
  resolveActiveMatesPickSlot,
  shouldBeginMatePlanePick,
  pickMatePlaneAtPointer,
}

export type { PickMatePlaneAtPointerInput, PickMatePlaneAtPointerReason }

export const MATE_ENTITY_PICK_FILTER: ModelSelectionProximityFilter = {
  facePlane: true,
  edgeLine: true,
  vertex: true,
}

/** Jak w pickMeshElement — duża płaszczyzna przed elipsą obrzeża. */
const SUBSTANTIAL_FLAT_FACES = 3

export type PickMateEntityAtPointerInput = PickMatePlaneAtPointerInput

export type PickMateEntityAtPointerReason =
  | PickMatePlaneAtPointerReason
  | 'noPick'
  | 'captureLineFailed'
  | 'captureVertexFailed'

export type PickMateEntityAtPointerResult =
  | { ok: true; slot: MatesPickSlot; entity: MateEntityRef }
  | { ok: false; reason: PickMateEntityAtPointerReason }

const scratchLocal = new Vector3()

export function pickMateEntityAtPointer(
  input: PickMateEntityAtPointerInput,
): PickMateEntityAtPointerResult {
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

  const pick = resolveProximityPick(geometry, faceIndex, scratchLocal, MATE_ENTITY_PICK_FILTER, {
    camera,
    mesh: mesh as Object3D,
    pointer,
    viewport,
  })

  const flatPatch =
    pick.type === 'faces' ? [...pick.indices] : getCoplanarConnectedFaces(geometry, faceIndex)
  const substantialFlat = flatPatch.length >= SUBSTANTIAL_FLAT_FACES

  // 1) Pas walca (seed w paśmie)
  const asCurved = captureMateCurvedPlane(partId, geometry, faceIndex)
  if (asCurved.ok) {
    return { ok: true, slot: pickSlot, entity: asCurved.curvedPlane }
  }

  // 2) Duża płaszczyzna przed elipsą
  if (substantialFlat) {
    const captured = captureMatePlane(partId, geometry, faceIndex)
    if (captured.ok) {
      return { ok: true, slot: pickSlot, entity: captured.plane }
    }
  }

  // 3) Elipsa / środek
  if (pick.type === 'vertex') {
    const asCenter = captureMateEllipseCenterAtLocalPoint(partId, geometry, scratchLocal, {
      type: 'vertex',
      index: pick.index,
    })
    if (asCenter.ok) {
      return { ok: true, slot: pickSlot, entity: asCenter.center }
    }
    const asEllipse = captureMateEllipseFromVertex(partId, geometry, pick.index)
    if (asEllipse.ok) {
      return { ok: true, slot: pickSlot, entity: asEllipse.ellipse }
    }
  }

  if (pick.type === 'edge') {
    const asCenter = captureMateEllipseCenterAtLocalPoint(partId, geometry, scratchLocal, {
      type: 'edge',
      a: pick.a,
      b: pick.b,
    })
    if (asCenter.ok) {
      return { ok: true, slot: pickSlot, entity: asCenter.center }
    }
    const asEllipse = captureMateEllipse(partId, geometry, pick.a, pick.b)
    if (asEllipse.ok) {
      return { ok: true, slot: pickSlot, entity: asEllipse.ellipse }
    }
  }

  // 4) Mała płaska / vertex / line
  if (flatPatch.length > 0) {
    const captured = captureMatePlane(partId, geometry, faceIndex)
    if (captured.ok) {
      return { ok: true, slot: pickSlot, entity: captured.plane }
    }
  }

  if (pick.type === 'vertex') {
    const captured = captureMateVertex(partId, geometry, pick.index)
    if (!captured.ok) {
      return { ok: false, reason: 'captureVertexFailed' }
    }
    return { ok: true, slot: pickSlot, entity: captured.vertex }
  }

  if (pick.type === 'edge') {
    const captured = captureMateLine(partId, geometry, pick.a, pick.b)
    if (!captured.ok) {
      return { ok: false, reason: 'captureLineFailed' }
    }
    return { ok: true, slot: pickSlot, entity: captured.line }
  }

  return { ok: false, reason: 'noPick' }
}
