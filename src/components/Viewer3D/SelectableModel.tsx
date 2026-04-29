import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  Points,
  Vector3,
  type InterleavedBufferAttribute,
} from 'three'
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
import { resolveProximityPick } from '../../features/model-selection/proximityPick'
import { resolveFaceSelectionFlow } from '../../features/model-selection/faceSelectionFlow'
import type { ModelSelectionProximityFilter } from '../../features/model-selection/types'
import { FatLineSegments } from './FatLineSegments'

const PREVIEW_COLOR_HEX = '#22c55e'
const PREVIEW_FACE_OVERLAY_SOLID = '#2f9f55'
const SELECTION_FACE_OVERLAY_HEX = '#f97316'
const SELECTION_FACE_OVERLAY_SOLID = '#c45f14'
const PROBABLE_FACE_OVERLAY_SOLID = '#f7b267'
const EDGE_LINE_WIDTH_PX = 5

const FACE_OVERLAY_OFFSET = {
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
} as const

type HoverState =
  | { type: 'none' }
  | { type: 'faces'; indices: readonly number[] }
  | { type: 'edge'; a: number; b: number }
  | { type: 'vertex'; index: number }

function sameHover(a: HoverState, b: HoverState): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'none') return true
  if (a.type === 'vertex' && b.type === 'vertex') return a.index === b.index
  if (a.type === 'edge' && b.type === 'edge') return a.a === b.a && a.b === b.b
  if (a.type === 'faces' && b.type === 'faces') {
    if (a.indices.length !== b.indices.length) return false
    const sa = [...a.indices].sort((x, y) => x - y)
    const sb = [...b.indices].sort((x, y) => x - y)
    return sa.every((v, i) => v === sb[i])
  }
  return false
}

function triangleIndicesForFace(geometry: BufferGeometry, faceIndex: number): [number, number, number] {
  const index = geometry.getIndex()
  if (index) {
    const base = faceIndex * 3
    return [index.getX(base), index.getX(base + 1), index.getX(base + 2)]
  }
  const ia = faceIndex * 3
  return [ia, ia + 1, ia + 2]
}

type PositionAttribute = BufferAttribute | InterleavedBufferAttribute

/** Wypchnięcie trójkąta wzdłuż normalnej — rozdziela Z między sąsiadującymi trójkątami owerlaya. */
function pushOverlayTriangle(
  position: PositionAttribute,
  ia: number,
  ib: number,
  ic: number,
  triIndex: number,
  depthStep: number,
  out: Float32Array,
  w: number,
): number {
  const ax = position.getX(ia)
  const ay = position.getY(ia)
  const az = position.getZ(ia)
  const bx = position.getX(ib)
  const by = position.getY(ib)
  const bz = position.getZ(ib)
  const cx = position.getX(ic)
  const cy = position.getY(ic)
  const cz = position.getZ(ic)
  const abx = bx - ax
  const aby = by - ay
  const abz = bz - az
  const acx = cx - ax
  const acy = cy - ay
  const acz = cz - az
  let nx = aby * acz - abz * acy
  let ny = abz * acx - abx * acz
  let nz = abx * acy - aby * acx
  const len = Math.hypot(nx, ny, nz)
  const off = (1 + triIndex) * depthStep
  if (len < 1e-22) {
    out[w++] = ax
    out[w++] = ay
    out[w++] = az
    out[w++] = bx
    out[w++] = by
    out[w++] = bz
    out[w++] = cx
    out[w++] = cy
    out[w++] = cz
    return w
  }
  nx = (nx / len) * off
  ny = (ny / len) * off
  nz = (nz / len) * off
  out[w++] = ax + nx
  out[w++] = ay + ny
  out[w++] = az + nz
  out[w++] = bx + nx
  out[w++] = by + ny
  out[w++] = bz + nz
  out[w++] = cx + nx
  out[w++] = cy + ny
  out[w++] = cz + nz
  return w
}

interface SelectableModelProps {
  model: BufferGeometry
  geometryRevision: number
  selection: SelectionState
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>
  selectionProximityFilter: ModelSelectionProximityFilter
  onProbableFacesChange?: (faces: readonly number[]) => void
}

export function SelectableModel({
  model,
  geometryRevision,
  selection,
  onSelectionChange,
  selectionProximityFilter,
  onProbableFacesChange,
}: SelectableModelProps) {
  const meshRef = useRef<Mesh>(null)
  const vertexPointsRef = useRef<Points>(null)
  const vertexHoverPointsRef = useRef<Points>(null)
  const hoverFaceOverlayRef = useRef<Mesh>(null)
  const selectedFaceOverlayRef = useRef<Mesh>(null)
  const probableFaceOverlayRef = useRef<Mesh>(null)

  const [hover, setHover] = useState<HoverState>({ type: 'none' })
  const [probableFaces, setProbableFaces] = useState<readonly number[]>([])
  const [primaryFaces, setPrimaryFaces] = useState<readonly number[]>([])
  const selectionRef = useRef(selection)
  const primaryFacesRef = useRef<readonly number[]>(primaryFaces)

  const scratchLocal = useMemo(() => new Vector3(), [])

  useEffect(() => {
    setHover({ type: 'none' })
    setProbableFaces([])
    setPrimaryFaces([])
  }, [selectionProximityFilter, model])

  useEffect(() => {
    onProbableFacesChange?.(probableFaces)
  }, [onProbableFacesChange, probableFaces])

  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  useEffect(() => {
    primaryFacesRef.current = primaryFaces
  }, [primaryFaces])

  useEffect(() => {
    const hasAnySelection =
      selection.faces.length > 0 || selection.edges.length > 0 || selection.vertices.length > 0
    if (!hasAnySelection) {
      setPrimaryFaces([])
      setProbableFaces([])
    }
  }, [selection.faces.length, selection.edges.length, selection.vertices.length])

  const resolveHover = useCallback(
    (event: ThreeEvent<PointerEvent>): HoverState => {
      const mesh = meshRef.current
      if (!mesh) return { type: 'none' }

      const fi = event.faceIndex
      if (typeof fi !== 'number') return { type: 'none' }
      mesh.worldToLocal(scratchLocal.copy(event.point))
      const target = event.nativeEvent.target as HTMLElement | null
      const viewportWidth = target?.clientWidth ?? 0
      const viewportHeight = target?.clientHeight ?? 0
      return resolveProximityPick(model, fi, scratchLocal, selectionProximityFilter, {
        camera: event.camera,
        mesh,
        pointer: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
        viewport: { width: viewportWidth, height: viewportHeight },
      })
    },
    [model, scratchLocal, selectionProximityFilter],
  )

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const next = resolveHover(event)
      setHover((prev) => (sameHover(prev, next) ? prev : next))
    },
    [resolveHover],
  )

  const handlePointerOut = useCallback(() => {
    setHover({ type: 'none' })
  }, [])

  const overlayDepthBias = useMemo(() => {
    if (!model.boundingSphere) model.computeBoundingSphere()
    return Math.max(1e-6, (model.boundingSphere?.radius ?? 1) * 1e-7)
  }, [model, geometryRevision])

  const selectedFaceOverlayGeometry = useMemo(() => {
    if (selection.faces.length === 0) return null
    const position = model.getAttribute('position')
    if (!position) return null

    const arr = new Float32Array(selection.faces.length * 9)
    let w = 0
    let triIdx = 0
    for (const fi of selection.faces) {
      if (fi < 0) continue
      const [ia, ib, ic] = triangleIndicesForFace(model, fi)
      if (ia < 0 || ib < 0 || ic < 0 || ia >= position.count || ib >= position.count || ic >= position.count) {
        continue
      }
      w = pushOverlayTriangle(position, ia, ib, ic, triIdx++, overlayDepthBias, arr, w)
    }
    if (w === 0) return null

    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(arr.subarray(0, w), 3))
    return geo
  }, [model, geometryRevision, selection.faces, overlayDepthBias])

  useEffect(() => {
    if (!selectedFaceOverlayGeometry) return
    return () => {
      selectedFaceOverlayGeometry.dispose()
    }
  }, [selectedFaceOverlayGeometry])

  const edgeHighlightLinePositions = useMemo(() => {
    if (selection.edges.length === 0) return null
    const position = model.getAttribute('position')
    if (!position) return null

    const arr = new Float32Array(selection.edges.length * 6)
    let w = 0
    for (const e of selection.edges) {
      arr[w++] = position.getX(e.a)
      arr[w++] = position.getY(e.a)
      arr[w++] = position.getZ(e.a)
      arr[w++] = position.getX(e.b)
      arr[w++] = position.getY(e.b)
      arr[w++] = position.getZ(e.b)
    }
    return arr
  }, [model, geometryRevision, selection.edges])

  const probableFaceOverlayGeometry = useMemo(() => {
    if (probableFaces.length === 0) return null
    const position = model.getAttribute('position')
    if (!position) return null

    const arr = new Float32Array(probableFaces.length * 9)
    let w = 0
    let triIdx = 0
    for (const fi of probableFaces) {
      if (fi < 0) continue
      const [ia, ib, ic] = triangleIndicesForFace(model, fi)
      if (ia < 0 || ib < 0 || ic < 0 || ia >= position.count || ib >= position.count || ic >= position.count) {
        continue
      }
      w = pushOverlayTriangle(position, ia, ib, ic, triIdx++, overlayDepthBias, arr, w)
    }
    if (w === 0) return null

    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(arr.subarray(0, w), 3))
    return geo
  }, [model, geometryRevision, probableFaces, overlayDepthBias])

  useEffect(() => {
    if (!probableFaceOverlayGeometry) return
    return () => {
      probableFaceOverlayGeometry.dispose()
    }
  }, [probableFaceOverlayGeometry])

  const vertexPointsGeometry = useMemo(() => {
    if (selection.vertices.length === 0) return null
    const position = model.getAttribute('position')
    if (!position) return null

    const arr = new Float32Array(selection.vertices.length * 3)
    let w = 0
    for (const vi of selection.vertices) {
      if (vi < 0 || vi >= position.count) continue
      arr[w++] = position.getX(vi)
      arr[w++] = position.getY(vi)
      arr[w++] = position.getZ(vi)
    }
    if (w === 0) return null

    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(arr.subarray(0, w), 3))
    return geo
  }, [model, geometryRevision, selection.vertices])

  useEffect(() => {
    if (!vertexPointsGeometry) return
    return () => {
      vertexPointsGeometry.dispose()
    }
  }, [vertexPointsGeometry])

  const hoverFaceOverlayGeometry = useMemo(() => {
    if (hover.type !== 'faces' || hover.indices.length === 0) return null
    const position = model.getAttribute('position')
    if (!position) return null

    const arr = new Float32Array(hover.indices.length * 9)
    let w = 0
    let triIdx = 0
    for (const fi of hover.indices) {
      const [ia, ib, ic] = triangleIndicesForFace(model, fi)
      w = pushOverlayTriangle(position, ia, ib, ic, triIdx++, overlayDepthBias, arr, w)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(arr.subarray(0, w), 3))
    return geo
  }, [model, geometryRevision, hover, overlayDepthBias])

  useEffect(() => {
    if (!hoverFaceOverlayGeometry) return
    return () => {
      hoverFaceOverlayGeometry.dispose()
    }
  }, [hoverFaceOverlayGeometry])

  const hoverEdgeLinePositions = useMemo(() => {
    if (hover.type !== 'edge') return null
    const position = model.getAttribute('position')
    if (!position) return null
    const { a, b } = hover
    if (a < 0 || b < 0 || a >= position.count || b >= position.count) return null

    return new Float32Array([
      position.getX(a),
      position.getY(a),
      position.getZ(a),
      position.getX(b),
      position.getY(b),
      position.getZ(b),
    ])
  }, [model, geometryRevision, hover])

  const hoverVertexGeometry = useMemo(() => {
    if (hover.type !== 'vertex') return null
    const position = model.getAttribute('position')
    if (!position) return null
    const vi = hover.index
    if (vi < 0 || vi >= position.count) return null

    const arr = new Float32Array([position.getX(vi), position.getY(vi), position.getZ(vi)])
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(arr, 3))
    return geo
  }, [model, geometryRevision, hover])

  useEffect(() => {
    if (!hoverVertexGeometry) return
    return () => {
      hoverVertexGeometry.dispose()
    }
  }, [hoverVertexGeometry])

  useLayoutEffect(() => {
    const pts = vertexPointsRef.current
    if (!pts) return
    pts.raycast = () => {}
  }, [vertexPointsGeometry])

  useLayoutEffect(() => {
    const pts = vertexHoverPointsRef.current
    if (!pts) return
    pts.raycast = () => {}
  }, [hoverVertexGeometry])

  useLayoutEffect(() => {
    const m = hoverFaceOverlayRef.current
    if (!m) return
    m.raycast = () => {}
  }, [hoverFaceOverlayGeometry])

  useLayoutEffect(() => {
    const m = selectedFaceOverlayRef.current
    if (!m) return
    m.raycast = () => {}
  }, [selectedFaceOverlayGeometry])

  useLayoutEffect(() => {
    const m = probableFaceOverlayRef.current
    if (!m) return
    m.raycast = () => {}
  }, [probableFaceOverlayGeometry])

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    // ŚPM / PPM zostawiamy pod kątem OrbitControls (obrót / pan); wybór tylko LKM
    if (event.nativeEvent.button !== 0) return

    event.stopPropagation()
    const mesh = meshRef.current
    if (!mesh) return

    const { faceIndex } = event
    if (typeof faceIndex !== 'number') return

    mesh.worldToLocal(scratchLocal.copy(event.point))
    const target = event.nativeEvent.target as HTMLElement | null
    const viewportWidth = target?.clientWidth ?? 0
    const viewportHeight = target?.clientHeight ?? 0
    const pick = resolveProximityPick(model, faceIndex, scratchLocal, selectionProximityFilter, {
      camera: event.camera,
      mesh,
      pointer: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
      viewport: { width: viewportWidth, height: viewportHeight },
    })
    const currentSelection = selectionRef.current
    const currentPrimaryFaces = primaryFacesRef.current
    if (pick.type === 'none') return

    const shiftHeld = event.shiftKey || event.nativeEvent.shiftKey
    // Shift: toggle — jeśli element jest na liście, usuń; w przeciwnym razie dodaj
    const mode: 'replace' | 'toggle' = shiftHeld ? 'toggle' : 'replace'

    // Powtórny LKM na tym samym solo-zaznaczeniu — wyczyść (bez Shift)
    if (!shiftHeld) {
      if (pick.type === 'faces' && selectionIsOnlyFaceSet(currentSelection, pick.indices)) {
        onSelectionChange(createEmptySelection())
        setProbableFaces([])
        setPrimaryFaces([])
        return
      }
      if (pick.type === 'vertex' && selectionIsOnlyVertex(currentSelection, pick.index)) {
        onSelectionChange(createEmptySelection())
        setProbableFaces([])
        setPrimaryFaces([])
        return
      }
      if (pick.type === 'edge' && selectionIsOnlyEdge(currentSelection, pick.a, pick.b)) {
        onSelectionChange(createEmptySelection())
        setProbableFaces([])
        setPrimaryFaces([])
        return
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
        return
      }
      setPrimaryFaces(flow.nextPrimaryFaces)
      setProbableFaces(flow.nextProbableFaces)
      onSelectionChange(flow.nextSelection)
      return
    }

    setPrimaryFaces([])
    if (pick.type === 'vertex') {
      setProbableFaces([])
      onSelectionChange(selectVertex(currentSelection, pick.index, mode))
      return
    }

    const edgeProbableFaces = pick.probableFaceIndices ?? []
    setProbableFaces(edgeProbableFaces)
    onSelectionChange(selectEdge(currentSelection, pick.a, pick.b, mode))
  }

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={model}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
      >
        <meshStandardMaterial
          color="#e2eaf4"
          emissive="#6b7f95"
          emissiveIntensity={0.42}
          metalness={0}
          roughness={0.72}
          envMapIntensity={0}
        />
      </mesh>
      {selectedFaceOverlayGeometry && (
        <mesh ref={selectedFaceOverlayRef} geometry={selectedFaceOverlayGeometry} renderOrder={6}>
          <meshBasicMaterial
            color={SELECTION_FACE_OVERLAY_SOLID}
            side={DoubleSide}
            depthWrite={false}
            {...FACE_OVERLAY_OFFSET}
          />
        </mesh>
      )}
      {probableFaceOverlayGeometry && (
        <mesh ref={probableFaceOverlayRef} geometry={probableFaceOverlayGeometry} renderOrder={7}>
          <meshBasicMaterial
            color={PROBABLE_FACE_OVERLAY_SOLID}
            side={DoubleSide}
            depthTest={false}
            depthWrite={false}
            transparent
            opacity={0.28}
            {...FACE_OVERLAY_OFFSET}
          />
        </mesh>
      )}
      {hoverFaceOverlayGeometry && (
        <mesh ref={hoverFaceOverlayRef} geometry={hoverFaceOverlayGeometry} renderOrder={8}>
          <meshBasicMaterial
            color={PREVIEW_FACE_OVERLAY_SOLID}
            side={DoubleSide}
            depthWrite={false}
            {...FACE_OVERLAY_OFFSET}
          />
        </mesh>
      )}
      <FatLineSegments
        positions={edgeHighlightLinePositions}
        color={SELECTION_FACE_OVERLAY_HEX}
        linewidth={EDGE_LINE_WIDTH_PX}
        renderOrder={7}
        raycastDisabled
      />
      <FatLineSegments
        positions={hoverEdgeLinePositions}
        color={PREVIEW_COLOR_HEX}
        linewidth={EDGE_LINE_WIDTH_PX}
        renderOrder={9}
        raycastDisabled
        depthWrite={false}
      />
      {vertexPointsGeometry && (
        <points ref={vertexPointsRef} geometry={vertexPointsGeometry} renderOrder={10}>
          <pointsMaterial
            color="#f97316"
            size={10}
            sizeAttenuation={false}
            depthTest
            depthWrite={false}
            transparent
            opacity={1}
          />
        </points>
      )}
      {hoverVertexGeometry && (
        <points ref={vertexHoverPointsRef} geometry={hoverVertexGeometry} renderOrder={11}>
          <pointsMaterial
            color={PREVIEW_COLOR_HEX}
            size={10}
            sizeAttenuation={false}
            depthTest
            depthWrite={false}
            transparent
            opacity={1}
          />
        </points>
      )}
    </group>
  )
}
