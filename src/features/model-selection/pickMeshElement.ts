import type { BufferGeometry, Mesh, Vector3 } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import {
  createEmptySelection,
  selectEdge,
  selectVertex,
  selectionIsOnlyEdge,
  selectionIsOnlyFaceSet,
  selectionIsOnlyVertex,
  type SelectionState,
} from '../../lib/selection'
import { resolveFaceSelectionFlow } from './faceSelectionFlow'
import { resolveProximityPick } from './proximityPick'
import type { ModelSelectionProximityFilter } from './types'

export type PickMeshElementResult =
  | { kind: 'none' }
  | { kind: 'cleared' }
  | {
      kind: 'picked'
      selection: SelectionState
      probableFaces: readonly number[]
      primaryFaces: readonly number[]
    }

export function pickMeshElementAtPointer(input: {
  model: BufferGeometry
  mesh: Mesh
  event: ThreeEvent<PointerEvent>
  selectionProximityFilter: ModelSelectionProximityFilter
  currentSelection: SelectionState
  currentPrimaryFaces: readonly number[]
  probableFaces: readonly number[]
  shiftHeld: boolean
  localPoint: Vector3
}): PickMeshElementResult {
  const { model, mesh, event, selectionProximityFilter, localPoint } = input
  const { faceIndex } = event
  if (typeof faceIndex !== 'number') {
    return { kind: 'none' }
  }

  const target = event.nativeEvent.target as HTMLElement | null
  const viewportWidth = target?.clientWidth ?? 0
  const viewportHeight = target?.clientHeight ?? 0
  const pick = resolveProximityPick(model, faceIndex, localPoint, selectionProximityFilter, {
    camera: event.camera,
    mesh,
    pointer: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
    viewport: { width: viewportWidth, height: viewportHeight },
  })
  if (pick.type === 'none') {
    return { kind: 'none' }
  }

  const { currentSelection, currentPrimaryFaces, probableFaces, shiftHeld } = input
  const mode: 'replace' | 'toggle' = shiftHeld ? 'toggle' : 'replace'

  if (!shiftHeld) {
    if (pick.type === 'faces' && selectionIsOnlyFaceSet(currentSelection, pick.indices)) {
      return { kind: 'cleared' }
    }
    if (pick.type === 'vertex' && selectionIsOnlyVertex(currentSelection, pick.index)) {
      return { kind: 'cleared' }
    }
    if (pick.type === 'edge' && selectionIsOnlyEdge(currentSelection, pick.a, pick.b)) {
      return { kind: 'cleared' }
    }
  }

  if (pick.type === 'faces') {
    const flow = resolveFaceSelectionFlow({
      currentSelection,
      primaryFaces: currentPrimaryFaces,
      pickedFaces: pick.indices,
      probableFromPick: pick.probableIndices ?? [],
      probableFaces,
      shiftHeld,
    })
    if (flow.ignored) {
      return { kind: 'none' }
    }
    return {
      kind: 'picked',
      selection: flow.nextSelection,
      probableFaces: flow.nextProbableFaces,
      primaryFaces: flow.nextPrimaryFaces,
    }
  }

  if (pick.type === 'vertex') {
    return {
      kind: 'picked',
      selection: selectVertex(currentSelection, pick.index, mode),
      probableFaces: [],
      primaryFaces: [],
    }
  }

  return {
    kind: 'picked',
    selection: selectEdge(currentSelection, pick.a, pick.b, mode),
    probableFaces: shiftHeld ? (pick.probableFaceIndices ?? []) : [],
    primaryFaces: [],
  }
}

export function applyPickMeshElementResult(
  result: PickMeshElementResult,
  handlers: {
    onSelectionChange: (selection: SelectionState) => void
    onProbableFacesChange?: (faces: readonly number[]) => void
    setPrimaryFaces: (faces: readonly number[]) => void
  },
): void {
  if (result.kind === 'none') return
  if (result.kind === 'cleared') {
    handlers.onSelectionChange(createEmptySelection())
    handlers.onProbableFacesChange?.([])
    handlers.setPrimaryFaces([])
    return
  }
  handlers.setPrimaryFaces(result.primaryFaces)
  handlers.onProbableFacesChange?.(result.probableFaces)
  handlers.onSelectionChange(result.selection)
}
