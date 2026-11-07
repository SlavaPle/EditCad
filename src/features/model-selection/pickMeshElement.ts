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
import { trySelectCurvedPlaneFromFace } from './curvedPlaneSelection'
import {
  trySelectEllipseFromEdge,
  trySelectEllipseFromVertex,
  type EllipseChainResult,
} from './edgeEllipseSelection'
import { getCoplanarConnectedFaces } from './facePlaneSelection'
import { resolveFaceSelectionFlow } from './faceSelectionFlow'
import { resolveProximityPick } from './proximityPick'
import type { ModelSelectionProximityFilter } from './types'

/** Min trójkątów koplanarnych = „duża” płaszczyzna (pierścień / pokrywa), nie pojedyncza ścianka. */
const SUBSTANTIAL_FLAT_FACES = 3

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

  const flatFaces =
    pick.type === 'faces' ? [...pick.indices] : getCoplanarConnectedFaces(model, faceIndex)
  const substantialFlat = flatFaces.length >= SUBSTANTIAL_FLAT_FACES

  // 1) Pas walca — tylko gdy seed jest w paśmie (nie redirect z pokrywy)
  const curved = trySelectCurvedPlaneFromFace(model, faceIndex)
  if (curved && curved.faceIndices.length > 0 && curved.faceIndices.includes(faceIndex)) {
    const flow = resolveFaceSelectionFlow({
      currentSelection,
      primaryFaces: currentPrimaryFaces,
      pickedFaces: curved.faceIndices,
      probableFromPick: [],
      probableFaces,
      shiftHeld,
    })
    if (!flow.ignored) {
      return {
        kind: 'picked',
        selection: flow.nextSelection,
        probableFaces: flow.nextProbableFaces,
        primaryFaces: flow.nextPrimaryFaces,
      }
    }
  }

  // 2) Duża płaszczyzna przed elipsą (cienki pierścień: proximity ≈ zawsze edge)
  if (substantialFlat) {
    const flow = resolveFaceSelectionFlow({
      currentSelection,
      primaryFaces: currentPrimaryFaces,
      pickedFaces: flatFaces,
      probableFromPick: pick.type === 'faces' ? (pick.probableIndices ?? []) : [],
      probableFaces,
      shiftHeld,
    })
    if (!flow.ignored) {
      return {
        kind: 'picked',
        selection: flow.nextSelection,
        probableFaces: flow.nextProbableFaces,
        primaryFaces: flow.nextPrimaryFaces,
      }
    }
  }

  // 3) Łuk / elipsa
  if (pick.type === 'vertex') {
    const arcFromVtx = trySelectEllipseFromVertex(model, pick.index)
    if (arcFromVtx && arcFromVtx.vertexIndices.length >= 2) {
      return {
        kind: 'picked',
        selection: selectionFromEllipseChain(currentSelection, arcFromVtx, mode),
        probableFaces: [],
        primaryFaces: [],
      }
    }
  }

  if (pick.type === 'edge') {
    const arc = trySelectEllipseFromEdge(model, pick.a, pick.b)
    if (arc && arc.vertexIndices.length >= 2) {
      return {
        kind: 'picked',
        selection: selectionFromEllipseChain(currentSelection, arc, mode),
        probableFaces: shiftHeld ? (pick.probableFaceIndices ?? []) : [],
        primaryFaces: [],
      }
    }
  }

  // 4) Mała płaska łata
  if (flatFaces.length > 0) {
    const flow = resolveFaceSelectionFlow({
      currentSelection,
      primaryFaces: currentPrimaryFaces,
      pickedFaces: flatFaces,
      probableFromPick: pick.type === 'faces' ? (pick.probableIndices ?? []) : [],
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

  if (pick.type !== 'edge') {
    return { kind: 'none' }
  }

  return {
    kind: 'picked',
    selection: selectEdge(currentSelection, pick.a, pick.b, mode),
    probableFaces: shiftHeld ? (pick.probableFaceIndices ?? []) : [],
    primaryFaces: [],
  }
}

function selectionFromEllipseChain(
  currentSelection: SelectionState,
  arc: EllipseChainResult,
  mode: 'replace' | 'toggle',
): SelectionState {
  const idxs = arc.vertexIndices
  let next =
    mode === 'replace' ? createEmptySelection() : { ...currentSelection, faces: [], vertices: [] }
  for (let i = 0; i + 1 < idxs.length; i++) {
    next = selectEdge(next, idxs[i]!, idxs[i + 1]!, i === 0 && mode === 'replace' ? 'replace' : 'add')
  }
  if (arc.closed && idxs.length >= 2) {
    next = selectEdge(next, idxs[idxs.length - 1]!, idxs[0]!, 'add')
  }
  return next
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
