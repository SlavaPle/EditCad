import type {
  MateCurvedPlaneRef,
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

export function isMateCurvedPlaneRef(ref: MateEntityRef): ref is MateCurvedPlaneRef {
  return ref.kind === 'curvedPlane'
}

export function isMatePlaneEntityRef(ref: MateEntityRef): ref is MatePlaneRef {
  return (
    ref.kind !== 'line' &&
    ref.kind !== 'vertex' &&
    ref.kind !== 'ellipse' &&
    ref.kind !== 'ellipseCenter' &&
    ref.kind !== 'curvedPlane'
  )
}

export function mateEntityKind(ref: MateEntityRef): MateEntityKind {
  if (isMateLineRef(ref)) return 'line'
  if (isMateVertexRef(ref)) return 'vertex'
  if (isMateEllipseRef(ref)) return 'ellipse'
  if (isMateEllipseCenterRef(ref)) return 'ellipseCenter'
  if (isMateCurvedPlaneRef(ref)) return 'curvedPlane'
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
  if (a.partId !== b.partId) return false
  // Porównuj łaty po zbiorze ścian (faceIndex bywa seedem ze starych zapisów)
  if (a.faceIndices.length !== b.faceIndices.length) return false
  if (a.faceIndices.length === 0) return false
  const sa = [...a.faceIndices].sort((x, y) => x - y)
  const sb = [...b.faceIndices].sort((x, y) => x - y)
  return sa.every((face, index) => face === sb[index])
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

function curvedPlaneArcMatch(
  a: MateCurvedPlaneRef['arcA'],
  b: MateCurvedPlaneRef['arcA'],
): boolean {
  if (a.closed !== b.closed || a.vertexIndices.length !== b.vertexIndices.length) return false
  return a.vertexIndices.every((v, i) => v === b.vertexIndices[i])
}

export function mateCurvedPlaneRefsMatch(a: MateCurvedPlaneRef, b: MateCurvedPlaneRef): boolean {
  if (a.partId !== b.partId || a.faceIndex !== b.faceIndex) return false
  if (a.faceIndices.length !== b.faceIndices.length) return false
  if (!a.faceIndices.every((f, i) => f === b.faceIndices[i])) return false
  if (!curvedPlaneArcMatch(a.arcA, b.arcA)) return false
  if ((a.arcB === undefined) !== (b.arcB === undefined)) return false
  if (a.arcB && b.arcB && !curvedPlaneArcMatch(a.arcB, b.arcB)) return false
  if (a.apexVertexIndex !== b.apexVertexIndex) return false
  return true
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
  if (isMateCurvedPlaneRef(a) && isMateCurvedPlaneRef(b)) {
    return mateCurvedPlaneRefsMatch(a, b)
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

export function asMateCurvedPlaneRef(ref: MateEntityRef): MateCurvedPlaneRef | null {
  return isMateCurvedPlaneRef(ref) ? ref : null
}
