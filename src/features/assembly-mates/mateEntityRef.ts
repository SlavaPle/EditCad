import type {
  MateEntityKind,
  MateEntityRef,
  MateLineRef,
  MatePlaneRef,
  MateVertexRef,
} from './model'

export function isMateLineRef(ref: MateEntityRef): ref is MateLineRef {
  return ref.kind === 'line'
}

export function isMateVertexRef(ref: MateEntityRef): ref is MateVertexRef {
  return ref.kind === 'vertex'
}

export function isMatePlaneEntityRef(ref: MateEntityRef): ref is MatePlaneRef {
  return ref.kind !== 'line' && ref.kind !== 'vertex'
}

export function mateEntityKind(ref: MateEntityRef): MateEntityKind {
  if (isMateLineRef(ref)) return 'line'
  if (isMateVertexRef(ref)) return 'vertex'
  return 'plane'
}

export function mateEntityPartId(ref: MateEntityRef): string {
  return ref.partId
}

export function normalizeMateLineVertices(vertexA: number, vertexB: number): [number, number] {
  return vertexA <= vertexB ? [vertexA, vertexB] : [vertexB, vertexA]
}

export function mateLineRefsMatch(a: MateLineRef, b: MateLineRef): boolean {
  if (a.partId !== b.partId) return false
  const [a0, a1] = normalizeMateLineVertices(a.vertexA, a.vertexB)
  const [b0, b1] = normalizeMateLineVertices(b.vertexA, b.vertexB)
  return a0 === b0 && a1 === b1
}

export function matePlaneRefsMatch(a: MatePlaneRef, b: MatePlaneRef): boolean {
  if (a.partId !== b.partId || a.faceIndex !== b.faceIndex) return false
  if (a.faceIndices.length !== b.faceIndices.length) return false
  return a.faceIndices.every((face, index) => face === b.faceIndices[index])
}

export function mateVertexRefsMatch(a: MateVertexRef, b: MateVertexRef): boolean {
  return a.partId === b.partId && a.vertexIndex === b.vertexIndex
}

export function mateEntityRefsMatch(a: MateEntityRef, b: MateEntityRef): boolean {
  if (mateEntityKind(a) !== mateEntityKind(b)) return false
  if (isMateLineRef(a) && isMateLineRef(b)) {
    return mateLineRefsMatch(a, b)
  }
  if (isMateVertexRef(a) && isMateVertexRef(b)) {
    return mateVertexRefsMatch(a, b)
  }
  if (isMatePlaneEntityRef(a) && isMatePlaneEntityRef(b)) {
    return matePlaneRefsMatch(a, b)
  }
  return false
}

export function asMatePlaneRef(ref: MateEntityRef): MatePlaneRef | null {
  return isMatePlaneEntityRef(ref) ? ref : null
}

export function asMateLineRef(ref: MateEntityRef): MateLineRef | null {
  return isMateLineRef(ref) ? ref : null
}

export function asMateVertexRef(ref: MateEntityRef): MateVertexRef | null {
  return isMateVertexRef(ref) ? ref : null
}
