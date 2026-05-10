import type { BufferGeometry } from 'three'
import type { FaceConstraint, ProfilFrozenSlotStored } from '../face-constraints/model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { resolveTriangleIndicesForConstraint } from './resolveConstraintFaces'

/** Wierzchołki pozycji (jak measureEdgeLengthMm) dla trójkąta o indeksie faceIndex. */
function trianglePositionIndicesForFace(geometry: BufferGeometry, faceIndex: number): [number, number, number] {
  const index = geometry.getIndex()
  if (index) {
    const base = faceIndex * 3
    return [index.getX(base), index.getX(base + 1), index.getX(base + 2)]
  }
  const ia = faceIndex * 3
  return [ia, ia + 1, ia + 2]
}

/**
 * Trójkąty siatki zawierające oba wierzchołki krawędzi (np. CONST / PROFIL frozen po edgeVertexPair).
 */
export function collectTriangleIndicesSharingVertexPair(
  geometry: BufferGeometry,
  va: number,
  vb: number,
): number[] {
  const index = geometry.getIndex()
  const pos = geometry.getAttribute('position')
  const triCount = index ? index.count / 3 : (pos?.count ?? 0) / 3
  const out: number[] = []
  for (let t = 0; t < triCount; t++) {
    const [i0, i1, i2] = trianglePositionIndicesForFace(geometry, t)
    const hasA = i0 === va || i1 === va || i2 === va
    const hasB = i0 === vb || i1 === vb || i2 === vb
    if (hasA && hasB) out.push(t)
  }
  return out
}

function addElementPairTriangles(
  elementAId: string | undefined,
  elementBId: string | undefined,
  elements: readonly PreparedModelElement[] | undefined,
  sink: Set<number>,
): void {
  const a = elementAId?.trim()
  const b = elementBId?.trim()
  if (!a || !b || !elements?.length) return
  const ea = elements.find((e) => e.id === a)
  const eb = elements.find((e) => e.id === b)
  if (!ea || !eb) return
  for (const fi of ea.faceIndices) sink.add(fi)
  for (const fi of eb.faceIndices) sink.add(fi)
}

function addProfilFrozenSlot(
  slot: ProfilFrozenSlotStored | undefined,
  geometry: BufferGeometry | null,
  elements: readonly PreparedModelElement[] | undefined,
  sink: Set<number>,
): void {
  if (!slot) return
  if (slot.edgeVertexPair && geometry) {
    const { va, vb } = slot.edgeVertexPair
    for (const t of collectTriangleIndicesSharingVertexPair(geometry, va, vb)) sink.add(t)
    return
  }
  addElementPairTriangles(slot.elementAId, slot.elementBId, elements, sink)
}

function mergeResolvedTriangles(
  c: FaceConstraint,
  elements: readonly PreparedModelElement[] | undefined,
  sink: Set<number>,
): void {
  const tri = resolveTriangleIndicesForConstraint(c, elements)
  if (!tri) return
  for (const fi of tri) sink.add(fi)
}

/** Indeksy trójkątów STL powiązanych z limitem — do podświetlenia na modelu. */
export function resolveConstraintDependentFaceIndices(params: {
  constraint: FaceConstraint
  geometry: BufferGeometry | null
  modelElements: readonly PreparedModelElement[] | undefined
}): number[] {
  const { constraint: c, geometry, modelElements: elements } = params
  const sink = new Set<number>()

  if (c.type === 'block') return []

  if (c.type === 'panel') {
    if (c.panelMeasureMode === 'facePairs') {
      addElementPairTriangles(c.panelXElementAId, c.panelXElementBId, elements, sink)
      addElementPairTriangles(c.panelYElementAId, c.panelYElementBId, elements, sink)
    }
    return [...sink].sort((a, b) => a - b)
  }

  if (c.type === 'profil') {
    mergeResolvedTriangles(c, elements, sink)
    addProfilFrozenSlot(c.frozen1, geometry, elements, sink)
    addProfilFrozenSlot(c.frozen2, geometry, elements, sink)
    return [...sink].sort((a, b) => a - b)
  }

  mergeResolvedTriangles(c, elements, sink)
  if (sink.size === 0 && c.type === 'const' && c.edgeVertexPair && geometry) {
    const { va, vb } = c.edgeVertexPair
    for (const t of collectTriangleIndicesSharingVertexPair(geometry, va, vb)) sink.add(t)
  }
  return [...sink].sort((a, b) => a - b)
}
