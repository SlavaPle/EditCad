import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, Points, Vector3 } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { selectEdge, selectFaces, selectVertex, type SelectionState } from '../../lib/selection'
import { resolveProximityPick } from '../../features/model-selection/proximityPick'
import type { ModelSelectionProximityFilter } from '../../features/model-selection/types'
import { FatLineSegments } from './FatLineSegments'

const PREVIEW_COLOR_HEX = '#22c55e'
const EDGE_LINE_WIDTH_PX = 5

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

interface SelectableModelProps {
  model: BufferGeometry
  selection: SelectionState
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>
  selectionProximityFilter: ModelSelectionProximityFilter
}

// Komponent siatki: wykrywanie wierzchołka / strykowej krawędzi / płaszczyzny w promieniu; podgląd (zielony), zatwierdzone (pomarańczowy)
export function SelectableModel({
  model,
  selection,
  onSelectionChange,
  selectionProximityFilter,
}: SelectableModelProps) {
  const meshRef = useRef<Mesh>(null)
  const vertexPointsRef = useRef<Points>(null)
  const vertexHoverPointsRef = useRef<Points>(null)
  const hoverFaceOverlayRef = useRef<Mesh>(null)

  const [hover, setHover] = useState<HoverState>({ type: 'none' })

  const baseColor = useMemo(() => new Color('#94a3b8'), [])
  const highlightColor = useMemo(() => new Color('#f97316'), [])
  const scratchLocal = useMemo(() => new Vector3(), [])

  useEffect(() => {
    setHover({ type: 'none' })
  }, [selectionProximityFilter, model])

  const resolveHover = useCallback(
    (event: ThreeEvent<PointerEvent>): HoverState => {
      const mesh = meshRef.current
      if (!mesh) return { type: 'none' }

      const fi = event.faceIndex
      if (typeof fi !== 'number') return { type: 'none' }
      mesh.worldToLocal(scratchLocal.copy(event.point))
      return resolveProximityPick(model, fi, scratchLocal, selectionProximityFilter)
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

  useEffect(() => {
    const position = model.getAttribute('position')
    if (!position) return

    const vertexCount = position.count
    let colorAttr = model.getAttribute('color') as BufferAttribute | null

    if (!colorAttr || colorAttr.count !== vertexCount) {
      const colors = new Float32Array(vertexCount * 3)
      for (let i = 0; i < vertexCount; i++) {
        colors[i * 3 + 0] = baseColor.r
        colors[i * 3 + 1] = baseColor.g
        colors[i * 3 + 2] = baseColor.b
      }
      colorAttr = new BufferAttribute(colors, 3)
      model.setAttribute('color', colorAttr)
    }

    const colors = colorAttr.array as Float32Array

    for (let i = 0; i < vertexCount; i++) {
      colors[i * 3 + 0] = baseColor.r
      colors[i * 3 + 1] = baseColor.g
      colors[i * 3 + 2] = baseColor.b
    }

    const index = model.getIndex()

    for (const faceIndex of selection.faces) {
      if (faceIndex < 0) continue

      if (index) {
        const ia = index.getX(faceIndex * 3)
        const ib = index.getX(faceIndex * 3 + 1)
        const ic = index.getX(faceIndex * 3 + 2)

        for (const vi of [ia, ib, ic]) {
          if (vi < 0 || vi >= vertexCount) continue
          colors[vi * 3 + 0] = highlightColor.r
          colors[vi * 3 + 1] = highlightColor.g
          colors[vi * 3 + 2] = highlightColor.b
        }
      } else {
        const ia = faceIndex * 3
        const ib = faceIndex * 3 + 1
        const ic = faceIndex * 3 + 2

        for (const vi of [ia, ib, ic]) {
          if (vi < 0 || vi >= vertexCount) continue
          colors[vi * 3 + 0] = highlightColor.r
          colors[vi * 3 + 1] = highlightColor.g
          colors[vi * 3 + 2] = highlightColor.b
        }
      }
    }

    // Wybrane wierzchołki: tylko warstwa Points — kolor wierzchołka siatki dawałby interpolację na całych trójkątach (artefakty „smugi”).

    colorAttr.needsUpdate = true
  }, [baseColor, highlightColor, model, selection])

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
  }, [model, selection.edges])

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
  }, [model, selection.vertices])

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
    for (const fi of hover.indices) {
      const [ia, ib, ic] = triangleIndicesForFace(model, fi)
      arr[w++] = position.getX(ia)
      arr[w++] = position.getY(ia)
      arr[w++] = position.getZ(ia)
      arr[w++] = position.getX(ib)
      arr[w++] = position.getY(ib)
      arr[w++] = position.getZ(ib)
      arr[w++] = position.getX(ic)
      arr[w++] = position.getY(ic)
      arr[w++] = position.getZ(ic)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(arr, 3))
    return geo
  }, [model, hover])

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
  }, [model, hover])

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
  }, [model, hover])

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

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const mesh = meshRef.current
    if (!mesh) return

    const { faceIndex } = event
    if (typeof faceIndex !== 'number') return

    mesh.worldToLocal(scratchLocal.copy(event.point))
    const pick = resolveProximityPick(model, faceIndex, scratchLocal, selectionProximityFilter)
    if (pick.type === 'none') return

    const shiftHeld = event.shiftKey || event.nativeEvent.shiftKey
    const mode: 'add' | 'replace' = shiftHeld ? 'add' : 'replace'

    if (pick.type === 'faces') {
      onSelectionChange((prev) => selectFaces(prev, pick.indices, mode))
      return
    }

    if (pick.type === 'vertex') {
      onSelectionChange((prev) => selectVertex(prev, pick.index, mode))
      return
    }

    onSelectionChange((prev) => selectEdge(prev, pick.a, pick.b, mode))
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
        <meshStandardMaterial vertexColors />
      </mesh>
      {hoverFaceOverlayGeometry && (
        <mesh ref={hoverFaceOverlayRef} geometry={hoverFaceOverlayGeometry} renderOrder={8}>
          <meshBasicMaterial
            color={PREVIEW_COLOR_HEX}
            transparent
            opacity={0.38}
            side={DoubleSide}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}
      <FatLineSegments
        positions={edgeHighlightLinePositions}
        color="#f97316"
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
