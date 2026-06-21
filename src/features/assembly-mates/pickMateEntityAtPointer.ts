import { Vector3, type Object3D } from 'three'

import { resolveProximityPick } from '../model-selection/proximityPick'

import type { ModelSelectionProximityFilter } from '../model-selection/types'

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



  if (pick.type === 'faces' && pick.indices.length > 0) {

    const captured = captureMatePlane(partId, geometry, pick.indices[0]!)

    if (!captured.ok) {

      return { ok: false, reason: 'captureFailed' }

    }

    return { ok: true, slot: pickSlot, entity: captured.plane }

  }



  return { ok: false, reason: 'noPick' }

}


