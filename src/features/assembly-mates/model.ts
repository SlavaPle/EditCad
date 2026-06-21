/** Typ przywiązania montażowego między detalami programu. */
export type MateKind = 'parallel'

/** Sposób zorientowania równoległych płaszczyzn / linii. */
export type MateAlignment = 'faceToFace' | 'sameDirection'

export type MateEntityKind = 'plane' | 'line' | 'vertex'

export type MatePairKind = `${MateEntityKind}-${MateEntityKind}`

/** @deprecated Tylko migracja starych plików .ecdasm */
export type ParallelMateMode = 'plane' | 'line'

/** Płaszczyzna siatki na detalu programu (łata trójkątów). */
export type MatePlaneRef = {
  kind?: 'plane'
  partId: string
  faceIndex: number
  faceIndices: number[]
}

/** Linia siatki na detalu programu (krawędź między wierzchołkami). */
export type MateLineRef = {
  kind: 'line'
  partId: string
  vertexA: number
  vertexB: number
}

/** Wierzchołek siatki na detalu programu. */
export type MateVertexRef = {
  kind: 'vertex'
  partId: string
  vertexIndex: number
}

export type MateEntityRef = MatePlaneRef | MateLineRef | MateVertexRef

export type ParallelMate = {
  id: string
  kind: 'parallel'
  entityA: MateEntityRef
  entityB: MateEntityRef
  alignment: MateAlignment
  offsetMm: number
}

export type AssemblyMate = ParallelMate

export type MateDraftValidationReason =
  | 'missingEntity'
  | 'samePart'
  | 'invalidOffset'
  | 'conflictsWithExisting'
  | 'unsupportedPair'

export function mateEntityKindFromRef(ref: MateEntityRef): MateEntityKind {
  if (ref.kind === 'line') return 'line'
  if (ref.kind === 'vertex') return 'vertex'
  return 'plane'
}

export function matePairKind(entityA: MateEntityRef, entityB: MateEntityRef): MatePairKind {
  return `${mateEntityKindFromRef(entityA)}-${mateEntityKindFromRef(entityB)}`
}

export function validateMatePlaneRef(value: unknown): value is MatePlaneRef {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.kind === 'line' || v.kind === 'vertex') return false
  if (typeof v.partId !== 'string' || v.partId.trim().length === 0) return false
  if (typeof v.faceIndex !== 'number' || !Number.isInteger(v.faceIndex) || v.faceIndex < 0) return false
  if (!Array.isArray(v.faceIndices) || v.faceIndices.length === 0) return false
  return v.faceIndices.every((f) => typeof f === 'number' && Number.isInteger(f) && f >= 0)
}

export function validateMateLineRef(value: unknown): value is MateLineRef {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.kind !== 'line') return false
  if (typeof v.partId !== 'string' || v.partId.trim().length === 0) return false
  if (typeof v.vertexA !== 'number' || !Number.isInteger(v.vertexA) || v.vertexA < 0) return false
  if (typeof v.vertexB !== 'number' || !Number.isInteger(v.vertexB) || v.vertexB < 0) return false
  return v.vertexA !== v.vertexB
}

export function validateMateVertexRef(value: unknown): value is MateVertexRef {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.kind !== 'vertex') return false
  if (typeof v.partId !== 'string' || v.partId.trim().length === 0) return false
  if (typeof v.vertexIndex !== 'number' || !Number.isInteger(v.vertexIndex) || v.vertexIndex < 0) return false
  return true
}

export function validateMateEntityRef(value: unknown): value is MateEntityRef {
  return validateMatePlaneRef(value) || validateMateLineRef(value) || validateMateVertexRef(value)
}

function readLegacyEntity(value: unknown, parallelMode: ParallelMateMode): MateEntityRef | null {
  if (validateMateEntityRef(value)) return value
  if (parallelMode === 'line' && validateMateLineRef(value)) return value
  if (parallelMode === 'plane' && validateMatePlaneRef(value)) return value
  return null
}

export function validateParallelMate(value: unknown): value is ParallelMate {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.kind !== 'parallel') return false
  if (typeof v.id !== 'string' || v.id.trim().length === 0) return false
  if (v.alignment !== 'faceToFace' && v.alignment !== 'sameDirection') return false
  if (typeof v.offsetMm !== 'number' || !Number.isFinite(v.offsetMm)) return false

  const entityA = v.entityA ?? v.planeA
  const entityB = v.entityB ?? v.planeB
  const parallelMode: ParallelMateMode = v.parallelMode === 'line' ? 'line' : 'plane'
  const a = readLegacyEntity(entityA, parallelMode)
  const b = readLegacyEntity(entityB, parallelMode)
  if (!a || !b) return false
  return true
}

export function validateAssemblyMate(value: unknown): value is AssemblyMate {
  return validateParallelMate(value)
}

export function createParallelMateId(): string {
  return `mate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Normalizacja odczytu z pliku — legacy planeA/planeB + parallelMode. */
export function normalizeParallelMate(value: ParallelMate | Record<string, unknown>): ParallelMate {
  const v = value as Record<string, unknown>
  const parallelMode: ParallelMateMode = v.parallelMode === 'line' ? 'line' : 'plane'
  const rawA = v.entityA ?? v.planeA
  const rawB = v.entityB ?? v.planeB
  const entityA = readLegacyEntity(rawA, parallelMode)!
  const entityB = readLegacyEntity(rawB, parallelMode)!
  return {
    id: String(v.id),
    kind: 'parallel',
    entityA,
    entityB,
    alignment: v.alignment === 'sameDirection' ? 'sameDirection' : 'faceToFace',
    offsetMm: Number(v.offsetMm),
  }
}

/** Czy para obsługuje wybór alignment (normale / kierunki). */
export function matePairSupportsAlignment(pair: MatePairKind): boolean {
  return pair === 'plane-plane' || pair === 'line-line'
}
