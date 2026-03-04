import { useEffect, useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { BufferAttribute, Color, Vector3, type BufferGeometry } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { selectFaces, type SelectionState } from '../../lib/selection'

const NORMAL_EPSILON = 1e-4
const DIST_EPSILON = 1e-3
const POSITION_EPSILON = 1e-5

type FaceVertices = [number, number, number]

function getFaceVertices(geometry: BufferGeometry): FaceVertices[] {
  const cached = (geometry as any).userData.__faceVertices as FaceVertices[] | undefined
  if (cached) return cached

  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()

  const faceCount = index ? index.count / 3 : position.count / 3
  const faces: FaceVertices[] = new Array(faceCount)

  if (index) {
    for (let f = 0; f < faceCount; f++) {
      const ia = index.getX(f * 3)
      const ib = index.getX(f * 3 + 1)
      const ic = index.getX(f * 3 + 2)
      faces[f] = [ia, ib, ic]
    }
  } else {
    for (let f = 0; f < faceCount; f++) {
      const ia = f * 3
      const ib = f * 3 + 1
      const ic = f * 3 + 2
      faces[f] = [ia, ib, ic]
    }
  }

  ;(geometry as any).userData.__faceVertices = faces
  return faces
}

function getFaceNeighbors(geometry: BufferGeometry): number[][] {
  const cached = (geometry as any).userData.__faceNeighbors as number[][] | undefined
  if (cached) return cached

  const faces = getFaceVertices(geometry)
  const neighbors: number[][] = faces.map(() => [])

  const edgeMap = new Map<string, number[]>()

   // Mapowanie współrzędnych pozycji na kanoniczne indeksy wierzchołków
  const position = geometry.getAttribute('position')
  const vertexCount = position.count
  const canonicalIndex = new Array<number>(vertexCount)
  const vertexKeyToCanonical = new Map<string, number>()

  for (let i = 0; i < vertexCount; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)

    const kx = Math.round(x / POSITION_EPSILON)
    const ky = Math.round(y / POSITION_EPSILON)
    const kz = Math.round(z / POSITION_EPSILON)

    const key = `${kx}_${ky}_${kz}`
    const existing = vertexKeyToCanonical.get(key)
    if (existing !== undefined) {
      canonicalIndex[i] = existing
    } else {
      vertexKeyToCanonical.set(key, i)
      canonicalIndex[i] = i
    }
  }

  const addEdge = (a: number, b: number, faceIndex: number) => {
    const ca = canonicalIndex[a]
    const cb = canonicalIndex[b]
    const key = ca < cb ? `${ca}_${cb}` : `${cb}_${ca}`
    const arr = edgeMap.get(key)
    if (arr) {
      arr.push(faceIndex)
    } else {
      edgeMap.set(key, [faceIndex])
    }
  }

  faces.forEach(([a, b, c], faceIndex) => {
    addEdge(a, b, faceIndex)
    addEdge(b, c, faceIndex)
    addEdge(c, a, faceIndex)
  })

  for (const list of edgeMap.values()) {
    if (list.length < 2) continue
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const f1 = list[i]
        const f2 = list[j]
        neighbors[f1].push(f2)
        neighbors[f2].push(f1)
      }
    }
  }

  ;(geometry as any).userData.__faceNeighbors = neighbors
  return neighbors
}

function computeFacePlane(
  geometry: BufferGeometry,
  faces: FaceVertices[],
  faceIndex: number,
  targetNormal: Vector3,
): { normal: Vector3; constant: number } {
  const position = geometry.getAttribute('position')
  const [ia, ib, ic] = faces[faceIndex]

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

  targetNormal.set(
    aby * acz - abz * acy,
    abz * acx - abx * acz,
    abx * acy - aby * acx,
  )

  targetNormal.normalize()

  const constant = -(targetNormal.x * ax + targetNormal.y * ay + targetNormal.z * az)
  return { normal: targetNormal, constant }
}

function isCoplanarNeighbor(
  geometry: BufferGeometry,
  faces: FaceVertices[],
  baseNormal: Vector3,
  baseConstant: number,
  neighborFaceIndex: number,
  tmpNormal: Vector3,
): boolean {
  const { normal, constant } = computeFacePlane(geometry, faces, neighborFaceIndex, tmpNormal)

  const dot = baseNormal.dot(normal)
  if (1 - dot > NORMAL_EPSILON) {
    return false
  }

  const distDiff = Math.abs(constant - baseConstant)
  return distDiff <= DIST_EPSILON
}

function getCoplanarConnectedFaces(geometry: BufferGeometry, seedFaceIndex: number): number[] {
  const faces = getFaceVertices(geometry)
  const neighbors = getFaceNeighbors(geometry)

  const baseNormal = new Vector3()
  const tmpNormal = new Vector3()
  const { normal, constant } = computeFacePlane(geometry, faces, seedFaceIndex, baseNormal)
  const baseConstant = constant

  const result: number[] = []
  const visited = new Set<number>()
  const queue: number[] = []

  visited.add(seedFaceIndex)
  queue.push(seedFaceIndex)

  while (queue.length > 0) {
    const current = queue.shift() as number
    result.push(current)

    for (const n of neighbors[current]) {
      if (visited.has(n)) continue
      if (!isCoplanarNeighbor(geometry, faces, normal, baseConstant, n, tmpNormal)) continue
      visited.add(n)
      queue.push(n)
    }
  }

  return result
}

interface SelectableModelProps {
  model: BufferGeometry
  selection: SelectionState
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>
}

// Komponent odpowiedzialny za interaktywny wybór elementów modelu i ich podświetlenie
export function SelectableModel({ model, selection, onSelectionChange }: SelectableModelProps) {
  const baseColor = useMemo(() => new Color('#94a3b8'), [])
  const highlightColor = useMemo(() => new Color('#f97316'), [])

  // Aktualizacja atrybutu kolorów geometrii na podstawie zaznaczonych ścian
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

    // Reset do koloru bazowego
    for (let i = 0; i < vertexCount; i++) {
      colors[i * 3 + 0] = baseColor.r
      colors[i * 3 + 1] = baseColor.g
      colors[i * 3 + 2] = baseColor.b
    }

    const index = model.getIndex()

    // Podświetlenie wybranych ścian
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

    colorAttr.needsUpdate = true
  }, [baseColor, highlightColor, model, selection])

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()

    const { faceIndex } = event
    if (typeof faceIndex === 'number') {
      const faces = getCoplanarConnectedFaces(model, faceIndex)
      onSelectionChange((prev) =>
        selectFaces(prev, faces, event.shiftKey ? 'add' : 'replace'),
      )
    }
  }

  return (
    <mesh geometry={model} onPointerDown={handlePointerDown}>
      <meshStandardMaterial vertexColors />
    </mesh>
  )
}

