/** Typ przywiązania montażowego między detalami programu. */
export type MateKind = 'parallel'

/** Sposób zorientowania równoległych płaszczyzn. */
export type MateAlignment = 'faceToFace' | 'sameDirection'

/** Płaszczyzna siatki na detalu programu (łata trójkątów). */
export type MatePlaneRef = {
  partId: string
  faceIndex: number
  faceIndices: number[]
}

export type ParallelMate = {
  id: string
  kind: 'parallel'
  planeA: MatePlaneRef
  planeB: MatePlaneRef
  alignment: MateAlignment
  offsetMm: number
}

export type AssemblyMate = ParallelMate

export type MateDraftValidationReason = 'missingPlane' | 'samePart' | 'invalidOffset'

export function validateMatePlaneRef(value: unknown): value is MatePlaneRef {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.partId !== 'string' || v.partId.trim().length === 0) return false
  if (typeof v.faceIndex !== 'number' || !Number.isInteger(v.faceIndex) || v.faceIndex < 0) return false
  if (!Array.isArray(v.faceIndices) || v.faceIndices.length === 0) return false
  return v.faceIndices.every((f) => typeof f === 'number' && Number.isInteger(f) && f >= 0)
}

export function validateParallelMate(value: unknown): value is ParallelMate {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.kind !== 'parallel') return false
  if (typeof v.id !== 'string' || v.id.trim().length === 0) return false
  if (!validateMatePlaneRef(v.planeA) || !validateMatePlaneRef(v.planeB)) return false
  if (v.alignment !== 'faceToFace' && v.alignment !== 'sameDirection') return false
  if (typeof v.offsetMm !== 'number' || !Number.isFinite(v.offsetMm)) return false
  return true
}

export function validateAssemblyMate(value: unknown): value is AssemblyMate {
  return validateParallelMate(value)
}

export function createParallelMateId(): string {
  return `mate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
