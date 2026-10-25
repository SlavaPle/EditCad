import type {
  MateEllipseCenterRef,
  MateEllipseRef,
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

export function isMateEllipseRef(ref: MateEntityRef): ref is MateEllipseRef {
  return ref.kind === 'ellipse'
}

export function isMateEllipseCenterRef(ref: MateEntityRef): ref is MateEllipseCenterRef {
  return ref.kind === 'ellipseCenter'
}

export function isMatePlaneEntityRef(ref: MateEntityRef): ref is MatePlaneRef {
  return (
    ref.kind !== 'line' &&
    ref.kind !== 'vertex' &&
    ref.kind !== 'ellipse' &&
    ref.kind !== 'ellipseCenter'
  )
}

export function mateEntityKind(ref: MateEntityRef): MateEntityKind {
  if (isMateLineRef(ref)) return 'line'
  if (isMateVertexRef(ref)) return 'vertex'
  if (isMateEllipseRef(ref)) return 'ellipse'
  if (isMateEllipseCenterRef(ref)) return 'ellipseCenter'
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

export function mateEllipseRefsMatch(a: MateEllipseRef, b: MateEllipseRef): boolean {
  if (a.partId !== b.partId || a.closed !== b.closed) return false
  if (a.vertexIndices.length !== b.vertexIndices.length) return false
  return a.vertexIndices.every((v, i) => v === b.vertexIndices[i])
}

export function mateEllipseCenterRefsMatch(
  a: MateEllipseCenterRef,
  b: MateEllipseCenterRef,
): boolean {
  if (a.partId !== b.partId || a.closed !== b.closed) return false
  if (a.vertexIndices.length !== b.vertexIndices.length) return false
  return a.vertexIndices.every((v, i) => v === b.vertexIndices[i])
}

export function mateEntityRefsMatch(a: MateEntityRef, b: MateEntityRef): boolean {
  if (mateEntityKind(a) !== mateEntityKind(b)) return false
  if (isMateLineRef(a) && isMateLineRef(b)) {
    return mateLineRefsMatch(a, b)
  }
  if (isMateVertexRef(a) && isMateVertexRef(b)) {
    return mateVertexRefsMatch(a, b)
  }
  if (isMateEllipseRef(a) && isMateEllipseRef(b)) {
    return mateEllipseRefsMatch(a, b)
  }
  if (isMateEllipseCenterRef(a) && isMateEllipseCenterRef(b)) {
    return mateEllipseCenterRefsMatch(a, b)
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

export function asMateEllipseRef(ref: MateEntityRef): MateEllipseRef | null {
  return isMateEllipseRef(ref) ? ref : null
}

export function asMateEllipseCenterRef(ref: MateEntityRef): MateEllipseCenterRef | null {
  return isMateEllipseCenterRef(ref) ? ref : null
}


