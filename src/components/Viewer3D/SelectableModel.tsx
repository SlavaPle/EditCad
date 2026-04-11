import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { BufferAttribute, BufferGeometry, Color, Mesh, Points, Vector3 } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { selectEdge, selectFaces, selectVertex, type SelectionState } from '../../lib/selection'
import { getCoplanarConnectedFaces } from '../../features/model-selection/facePlaneSelection'
import {
  edgePickToleranceFromGeometry,
  pickClosestTriangleEdge,
} from '../../features/model-selection/edgeLineSelection'
import { pickClosestTriangleVertex } from '../../features/model-selection/vertexPointSelection'
import type { ModelSelectionInteractionMode } from '../../features/model-selection/types'

interface SelectableModelProps {
  model: BufferGeometry
  selection: SelectionState
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>
  interactionMode: ModelSelectionInteractionMode
}

// Komponent siatki: płaszczyzny, krawędzie trójkąta lub wierzchołki przy trafieniu promienia
export function SelectableModel({
  model,
  selection,
  onSelectionChange,
  interactionMode,
}: SelectableModelProps) {
  const meshRef = useRef<Mesh>(null)
  const vertexPointsRef = useRef<Points>(null)
  const baseColor = useMemo(() => new Color('#94a3b8'), [])
  const highlightColor = useMemo(() => new Color('#f97316'), [])
  const scratchLocal = useMemo(() => new Vector3(), [])

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

  const edgeHighlightGeometry = useMemo(() => {
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
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(arr, 3))
    return geo
  }, [model, selection.edges])

  useEffect(() => {
    if (!edgeHighlightGeometry) return
    return () => {
      edgeHighlightGeometry.dispose()
    }
  }, [edgeHighlightGeometry])

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

  useLayoutEffect(() => {
    const pts = vertexPointsRef.current
    if (!pts) return
    pts.raycast = () => {}
  }, [vertexPointsGeometry])

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const mesh = meshRef.current
    if (!mesh) return

    if (interactionMode === 'facePlane') {
      const { faceIndex } = event
      if (typeof faceIndex === 'number') {
        const faces = getCoplanarConnectedFaces(model, faceIndex)
        onSelectionChange((prev) =>
          selectFaces(prev, faces, event.shiftKey ? 'add' : 'replace'),
        )
      }
      return
    }

    const { faceIndex } = event
    if (typeof faceIndex !== 'number') return

    mesh.worldToLocal(scratchLocal.copy(event.point))

    if (interactionMode === 'vertex') {
      const tol = edgePickToleranceFromGeometry(model, 0.03)
      const vertexIndex = pickClosestTriangleVertex(model, faceIndex, scratchLocal, tol)
      if (vertexIndex === null) return
      onSelectionChange((prev) =>
        selectVertex(prev, vertexIndex, event.shiftKey ? 'add' : 'replace'),
      )
      return
    }

    const tol = edgePickToleranceFromGeometry(model)
    const edge = pickClosestTriangleEdge(model, faceIndex, scratchLocal, tol)
    if (!edge) return

    onSelectionChange((prev) =>
      selectEdge(prev, edge.a, edge.b, event.shiftKey ? 'add' : 'replace'),
    )
  }

  return (
    <group>
      <mesh ref={meshRef} geometry={model} onPointerDown={handlePointerDown}>
        <meshStandardMaterial vertexColors />
      </mesh>
      {edgeHighlightGeometry && (
        <lineSegments geometry={edgeHighlightGeometry}>
          <lineBasicMaterial color="#f97316" depthTest />
        </lineSegments>
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
    </group>
  )
}
