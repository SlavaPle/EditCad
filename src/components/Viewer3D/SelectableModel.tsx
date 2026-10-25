import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
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
import { Sphere } from '@react-three/drei'
import type { SelectionState } from '../../lib/selection'
import { resolveProximityPick } from '../../features/model-selection/proximityPick'
import {
  applyPickMeshElementResult,
  pickMeshElementAtPointer,
} from '../../features/model-selection/pickMeshElement'
import {
  ellipseCenterFromVertexChain,
  ellipseChainToSegmentPositions,
  trySelectEllipseFromEdge,
  trySelectEllipseFromVertex,
  trySelectEllipseNearFace,
} from '../../features/model-selection/edgeEllipseSelection'
import { trySelectCurvedPlaneFromFace } from '../../features/model-selection/curvedPlaneSelection'
import {
  curvedAxisMarkerRadius,
  dashDotAxisPositions,
} from '../../features/assembly-mates/dashDotAxisPositions'
import type { ModelSelectionProximityFilter } from '../../features/model-selection/types'
import {
  buildMeshEdgeLinePositions,
  isSolidBodyDisplayMode,
  usesModelEdgeLines,
  type ModelDisplayMode,
} from '../../features/viewer-display/modelDisplayMode'
import { getBodyTransparencyRenderState } from '../../features/viewer-display/bodyTransparencySettings'
import { FatLineSegments } from './FatLineSegments'
import type { ModelAppearance } from '../../features/viewer-display/modelAppearance'
import { TexturedBodyMaterial } from './TexturedBodyMaterial'

const PREVIEW_COLOR_HEX = '#22c55e'
const PREVIEW_FACE_OVERLAY_SOLID = '#2f9f55'
const SELECTION_FACE_OVERLAY_HEX = '#f97316'
const SELECTION_FACE_OVERLAY_SOLID = '#c45f14'
const PROBABLE_FACE_OVERLAY_SOLID = '#f7b267'
const EDGE_LINE_WIDTH_PX = 5
const MODEL_EDGE_LINE_WIDTH_PX = 2
const MODEL_EDGE_COLOR_HEX = '#94a3b8'

const FACE_OVERLAY_OFFSET = {
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
} as const

type CurvedHoverArc = {
  polyline: readonly number[]
  closed: boolean
  center?: readonly [number, number, number]
}

type HoverState =
  | { type: 'none' }
  | { type: 'faces'; indices: readonly number[] }
  | {
      type: 'edge'
      a: number
      b: number
      /** Podgląd łuku/elipsy (na żywo przy mates pick). */
      polyline?: readonly number[]
      closed?: boolean
      /** Środek dopasowanej elipsy (lokalnie). */
      center?: readonly [number, number, number]
    }
  | {
      type: 'curvedPlane'
      indices: readonly number[]
      arcs: readonly CurvedHoverArc[]
      axisFrom?: readonly [number, number, number]
      axisTo?: readonly [number, number, number]
    }
  | { type: 'vertex'; index: number }

function sameHoverArc(a: CurvedHoverArc, b: CurvedHoverArc): boolean {
  if (a.closed !== b.closed || a.polyline.length !== b.polyline.length) return false
  if (!a.polyline.every((v, i) => v === b.polyline[i])) return false
  const ca = a.center
  const cb = b.center
  if (!ca && !cb) return true
  if (!ca || !cb) return false
  return ca[0] === cb[0] && ca[1] === cb[1] && ca[2] === cb[2]
}

function sameHover(a: HoverState, b: HoverState): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'none') return true
  if (a.type === 'vertex' && b.type === 'vertex') return a.index === b.index
  if (a.type === 'edge' && b.type === 'edge') {
    if (a.a !== b.a || a.b !== b.b) return false
    const pa = a.polyline
    const pb = b.polyline
    if (!pa && !pb) return true
    if (!pa || !pb || pa.length !== pb.length) return false
    if ((a.closed ?? false) !== (b.closed ?? false)) return false
    if (!pa.every((v, i) => v === pb[i])) return false
    const ca = a.center
    const cb = b.center
    if (!ca && !cb) return true
    if (!ca || !cb) return false
    return ca[0] === cb[0] && ca[1] === cb[1] && ca[2] === cb[2]
  }
  if (a.type === 'curvedPlane' && b.type === 'curvedPlane') {
    if (a.indices.length !== b.indices.length) return false
    const sa = [...a.indices].sort((x, y) => x - y)
    const sb = [...b.indices].sort((x, y) => x - y)
    if (!sa.every((v, i) => v === sb[i])) return false
    if (a.arcs.length !== b.arcs.length) return false
    if (!a.arcs.every((arc, i) => sameHoverArc(arc, b.arcs[i]!))) return false
    const af = a.axisFrom
    const bf = b.axisFrom
    const at = a.axisTo
    const bt = b.axisTo
    if (!af && !bf && !at && !bt) return true
    if (!af || !bf || !at || !bt) return false
    return (
      af[0] === bf[0] &&
      af[1] === bf[1] &&
      af[2] === bf[2] &&
      at[0] === bt[0] &&
      at[1] === bt[1] &&
      at[2] === bt[2]
    )
  }
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
  displayMode: ModelDisplayMode
  appearance: ModelAppearance
  selection: SelectionState
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>
  selectionProximityFilter: ModelSelectionProximityFilter
  onProbableFacesChange?: (faces: readonly number[]) => void
  /** Gdy false — LKM nie wybiera elementów (np. drag detalu w montażu). */
  pickOnPointerDown?: boolean
  /** Gdy true — mesh nie bierze udziału w raycast (brak hover / pick). */
  raycastDisabled?: boolean
  /** Przy hover na krawędzi — podświetl cały łuk/elipsę (tryb mates). */
  expandEdgeHoverToEllipse?: boolean
  onMeshPointerDown?: (event: ThreeEvent<PointerEvent>) => void
  /** PPM — menu kontekstowe (np. Add mate w montażu). */
  onMeshContextMenu?: (event: ThreeEvent<MouseEvent>) => void
}

function noopRaycast() {}

export function SelectableModel({
  model,
  geometryRevision,
  displayMode,
  appearance,
  selection,
  onSelectionChange,
  selectionProximityFilter,
  onProbableFacesChange,
  pickOnPointerDown = true,
  raycastDisabled = false,
  expandEdgeHoverToEllipse = false,
  onMeshPointerDown,
  onMeshContextMenu,
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

  const showSolidBody = isSolidBodyDisplayMode(displayMode)
  const showTextured = displayMode === 'solidTextured'
  const showModelEdges = usesModelEdgeLines(displayMode)
  const bodyTransparency = useMemo(
    () => getBodyTransparencyRenderState(appearance.opacity),
    [appearance.opacity],
  )

  const modelEdgeLinePositions = useMemo(() => {
    if (!showModelEdges) return null
    return buildMeshEdgeLinePositions(model)
  }, [model, geometryRevision, showModelEdges])

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
      const pick = resolveProximityPick(model, fi, scratchLocal, selectionProximityFilter, {
        camera: event.camera,
        mesh,
        pointer: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
        viewport: { width: viewportWidth, height: viewportHeight },
      })
      // Najpierw pas walca/stożka: łuki + oś (bez wypełnienia ścian — mniej artefaktów)
      if (expandEdgeHoverToEllipse) {
        const curved = trySelectCurvedPlaneFromFace(model, fi)
        if (curved && curved.faceIndices.length > 0) {
          const arcs: CurvedHoverArc[] = []
          const cA = ellipseCenterFromVertexChain(model, curved.arcA.vertexIndices)
          arcs.push({
            polyline: curved.arcA.vertexIndices,
            closed: curved.arcA.closed,
            center: cA?.center,
          })
          let axisTo: readonly [number, number, number] | undefined
          if (curved.arcB) {
            const cB = ellipseCenterFromVertexChain(model, curved.arcB.vertexIndices)
            arcs.push({
              polyline: curved.arcB.vertexIndices,
              closed: curved.arcB.closed,
              center: cB?.center,
            })
            if (cB?.center) axisTo = cB.center
          } else if (curved.apexVertexIndex !== undefined) {
            const position = model.getAttribute('position')
            const vi = curved.apexVertexIndex
            if (position && vi >= 0 && vi < position.count) {
              axisTo = [position.getX(vi), position.getY(vi), position.getZ(vi)]
            }
          }
          return {
            type: 'curvedPlane',
            indices: curved.faceIndices,
            arcs,
            axisFrom: cA?.center,
            axisTo,
          }
        }
        if (pick.type === 'edge' || pick.type === 'vertex') {
          const arc =
            pick.type === 'edge'
              ? trySelectEllipseFromEdge(model, pick.a, pick.b)
              : trySelectEllipseFromVertex(model, pick.index)
          if (arc && arc.vertexIndices.length >= 2) {
            const fitted = ellipseCenterFromVertexChain(model, arc.vertexIndices)
            return {
              type: 'edge',
              a: arc.vertexIndices[0]!,
              b: arc.vertexIndices[1]!,
              polyline: arc.vertexIndices,
              closed: arc.closed,
              center: fitted?.center,
            }
          }
        } else {
          const arc = trySelectEllipseNearFace(model, fi)
          if (arc && arc.vertexIndices.length >= 2) {
            const fitted = ellipseCenterFromVertexChain(model, arc.vertexIndices)
            return {
              type: 'edge',
              a: arc.vertexIndices[0]!,
              b: arc.vertexIndices[1]!,
              polyline: arc.vertexIndices,
              closed: arc.closed,
              center: fitted?.center,
            }
          }
        }
      }
      if (pick.type === 'faces') return { type: 'faces', indices: pick.indices }
      if (pick.type === 'edge') return { type: 'edge', a: pick.a, b: pick.b }
      if (pick.type === 'vertex') return { type: 'vertex', index: pick.index }
      return { type: 'none' }
    },
    [expandEdgeHoverToEllipse, model, scratchLocal, selectionProximityFilter],
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
    const indices =
      hover.type === 'faces'
        ? hover.indices
        : hover.type === 'curvedPlane'
          ? hover.indices
          : null
    if (!indices || indices.length === 0) return null
    const position = model.getAttribute('position')
    if (!position) return null

    const arr = new Float32Array(indices.length * 9)
    let w = 0
    let triIdx = 0
    for (const fi of indices) {
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
    if (hover.type === 'curvedPlane') {
      const chunks: Float32Array[] = []
      let total = 0
      for (const arc of hover.arcs) {
        const seg = ellipseChainToSegmentPositions(model, arc.polyline, arc.closed)
        if (!seg) continue
        chunks.push(seg)
        total += seg.length
      }
      if (chunks.length === 0) return null
      const arr = new Float32Array(total)
      let w = 0
      for (const c of chunks) {
        arr.set(c, w)
        w += c.length
      }
      return arr
    }
    if (hover.type !== 'edge') return null
    if (hover.polyline && hover.polyline.length >= 2) {
      return ellipseChainToSegmentPositions(model, hover.polyline, hover.closed === true)
    }
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

  const hoverCurvedAxisPositions = useMemo(() => {
    if (hover.type !== 'curvedPlane' || !hover.axisFrom || !hover.axisTo) return null
    if (!model.boundingSphere) model.computeBoundingSphere()
    return dashDotAxisPositions(hover.axisFrom, hover.axisTo, model.boundingSphere?.radius)
  }, [model, geometryRevision, hover])

  const hoverCurvedAxisMarkers = useMemo(() => {
    if (hover.type !== 'curvedPlane' || !hover.axisFrom || !hover.axisTo) return null
    if (!model.boundingSphere) model.computeBoundingSphere()
    const modelScale = model.boundingSphere?.radius
    const axisLen = Math.hypot(
      hover.axisTo[0] - hover.axisFrom[0],
      hover.axisTo[1] - hover.axisFrom[1],
      hover.axisTo[2] - hover.axisFrom[2],
    )
    const radius = curvedAxisMarkerRadius(axisLen, modelScale)
    // #region agent log
    fetch('http://127.0.0.1:7882/ingest/cc58a8d9-c779-4012-82fb-05fda4bfad8c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '334439' },
      body: JSON.stringify({
        sessionId: '334439',
        runId: 'pre-fix',
        hypothesisId: 'H2-H4',
        location: 'SelectableModel.tsx:hoverCurvedAxisMarkers',
        message: 'curved hover axis scale',
        data: {
          axisLen,
          modelScale: modelScale ?? null,
          markerRadius: radius,
          segCount: hoverCurvedAxisPositions ? hoverCurvedAxisPositions.length / 6 : 0,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    return { from: hover.axisFrom, to: hover.axisTo, radius }
  }, [model, geometryRevision, hover, hoverCurvedAxisPositions])

  const hoverVertexGeometry = useMemo(() => {
    if (hover.type === 'curvedPlane') return null
    if (hover.type === 'edge' && hover.center) {
      const arr = new Float32Array([hover.center[0], hover.center[1], hover.center[2]])
      const geo = new BufferGeometry()
      geo.setAttribute('position', new BufferAttribute(arr, 3))
      return geo
    }
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
    const button = event.nativeEvent.button

    // ŚKM / PPM: OrbitControls, chyba że rodzic obsługuje (np. obrót detalu w montażu)
    if (button !== 0) {
      if (onMeshPointerDown) {
        event.stopPropagation()
        onMeshPointerDown(event)
      }
      return
    }

    event.stopPropagation()
    onMeshPointerDown?.(event)
    if (!pickOnPointerDown) return

    const mesh = meshRef.current
    if (!mesh) return

    const { faceIndex } = event
    if (typeof faceIndex !== 'number') return

    mesh.worldToLocal(scratchLocal.copy(event.point))
    const result = pickMeshElementAtPointer({
      model,
      mesh,
      event,
      selectionProximityFilter,
      currentSelection: selectionRef.current,
      currentPrimaryFaces: primaryFacesRef.current,
      probableFaces,
      shiftHeld: event.shiftKey || event.nativeEvent.shiftKey,
      localPoint: scratchLocal,
    })
    applyPickMeshElementResult(result, {
      onSelectionChange,
      onProbableFacesChange: setProbableFaces,
      setPrimaryFaces,
    })
  }

  const handleContextMenu = (event: ThreeEvent<MouseEvent>) => {
    if (!onMeshContextMenu) return
    event.stopPropagation()
    event.nativeEvent.preventDefault()
    onMeshContextMenu(event)
  }

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={model}
        raycast={raycastDisabled ? noopRaycast : undefined}
        onPointerMove={raycastDisabled ? undefined : handlePointerMove}
        onPointerOut={raycastDisabled ? undefined : handlePointerOut}
        onPointerDown={raycastDisabled ? undefined : handlePointerDown}
        onContextMenu={
          raycastDisabled || !onMeshContextMenu ? undefined : handleContextMenu
        }
      >
        {showSolidBody ? (
          showTextured ? (
            <TexturedBodyMaterial
              geometry={model}
              geometryRevision={geometryRevision}
              appearance={appearance}
            />
          ) : (
            <meshStandardMaterial
              color={appearance.color}
              emissive="#6b7f95"
              emissiveIntensity={bodyTransparency.meshStandardEmissiveIntensity}
              metalness={0}
              roughness={0.72}
              envMapIntensity={0}
              transparent={bodyTransparency.transparent}
              opacity={bodyTransparency.opacity}
              depthWrite={bodyTransparency.depthWrite}
              side={bodyTransparency.doubleSided ? DoubleSide : undefined}
            />
          )
        ) : (
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        )}
      </mesh>
      <FatLineSegments
        positions={modelEdgeLinePositions}
        color={MODEL_EDGE_COLOR_HEX}
        linewidth={MODEL_EDGE_LINE_WIDTH_PX}
        renderOrder={2}
        raycastDisabled
      />
      {showSolidBody && selectedFaceOverlayGeometry && (
        <mesh ref={selectedFaceOverlayRef} geometry={selectedFaceOverlayGeometry} renderOrder={6}>
          <meshBasicMaterial
            color={SELECTION_FACE_OVERLAY_SOLID}
            side={DoubleSide}
            depthWrite={false}
            {...FACE_OVERLAY_OFFSET}
          />
        </mesh>
      )}
      {showSolidBody && probableFaceOverlayGeometry && (
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
      {showSolidBody && hoverFaceOverlayGeometry && (
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
        depthTest={hover.type !== 'curvedPlane'}
      />
      <FatLineSegments
        positions={hoverCurvedAxisPositions}
        color={PREVIEW_COLOR_HEX}
        linewidth={1.5}
        renderOrder={12}
        raycastDisabled
        depthWrite={false}
        depthTest={false}
      />
      {hoverCurvedAxisMarkers && (
        <>
          <Sphere
            args={[hoverCurvedAxisMarkers.radius, 10, 10]}
            position={hoverCurvedAxisMarkers.from}
            renderOrder={13}
          >
            <meshBasicMaterial
              color={PREVIEW_COLOR_HEX}
              transparent
              opacity={0.95}
              depthTest={false}
              depthWrite={false}
            />
          </Sphere>
          <Sphere
            args={[hoverCurvedAxisMarkers.radius, 10, 10]}
            position={hoverCurvedAxisMarkers.to}
            renderOrder={13}
          >
            <meshBasicMaterial
              color={PREVIEW_COLOR_HEX}
              transparent
              opacity={0.95}
              depthTest={false}
              depthWrite={false}
            />
          </Sphere>
        </>
      )}
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
