/** Typ przywiązania montażowego między detalami programu. */
export type MateKind = 'parallel' | 'perpendicular' | 'angular'

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
  /** Zawsze ≥ 0; znak strony przez `flipped`. */
  offsetMm: number
  /** Odwraca stronę offsetu (zamiast ujemnego offsetMm). */
  flipped?: boolean
  /** Gdy true — przywiązka nie działa (można włączyć z powrotem). Brak / false = aktywna. */
  suppressed?: boolean
}

export type PerpendicularMate = {
  id: string
  kind: 'perpendicular'
  entityA: MateEntityRef
  entityB: MateEntityRef
  flipped: boolean
  suppressed?: boolean
}

export type AngularMate = {
  id: string
  kind: 'angular'
  entityA: MateEntityRef
  entityB: MateEntityRef
  angleDeg: number
  /** Jak parallel: faceToFace mierzy względem −nA / −dirA. */
  alignment: MateAlignment
  suppressed?: boolean
}

export type AssemblyMate = ParallelMate | PerpendicularMate | AngularMate

export type MateDraftValidationReason =
  | 'missingEntity'
  | 'samePart'
  | 'invalidOffset'
  | 'invalidAngle'
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

/** Pary plane/line obsługiwane przez perpendicular / angular. */
export function matePairSupportsOrient(pair: MatePairKind): boolean {
  return (
    pair === 'plane-plane' ||
    pair === 'line-line' ||
    pair === 'plane-line' ||
    pair === 'line-plane'
  )
}

/**
 * Czy dany kind jest dostępny przy wybranych encjach.
 * Wierzchołek — tylko parallel (orientacja nie ma sensu).
 */
export function mateKindAvailableForEntities(
  kind: MateKind,
  entityA: MateEntityRef | null | undefined,
  entityB: MateEntityRef | null | undefined,
): boolean {
  if (kind === 'parallel') return true
  const hasVertex =
    (entityA != null && mateEntityKindFromRef(entityA) === 'vertex') ||
    (entityB != null && mateEntityKindFromRef(entityB) === 'vertex')
  return !hasVertex
}

/** Znakowany offset: flipped odwraca stronę przy nieujemnym offsetMm. */
export function signedMateOffsetMm(offsetMm: number, flipped: boolean | undefined): number {
  const abs = Math.abs(offsetMm)
  return flipped ? -abs : abs
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
  if (typeof v.vertexIndex !== 'number' || !Number.isInteger(v.vertexIndex) || v.vertexIndex < 0) {
    return false
  }
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
  if (v.flipped !== undefined && typeof v.flipped !== 'boolean') return false

  const entityA = v.entityA ?? v.planeA
  const entityB = v.entityB ?? v.planeB
  const parallelMode: ParallelMateMode = v.parallelMode === 'line' ? 'line' : 'plane'
  const a = readLegacyEntity(entityA, parallelMode)
  const b = readLegacyEntity(entityB, parallelMode)
  if (!a || !b) return false
  if (v.suppressed !== undefined && typeof v.suppressed !== 'boolean') return false
  return true
}

export function validatePerpendicularMate(value: unknown): value is PerpendicularMate {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.kind !== 'perpendicular') return false
  if (typeof v.id !== 'string' || v.id.trim().length === 0) return false
  if (typeof v.flipped !== 'boolean') return false
  if (!validateMateEntityRef(v.entityA) || !validateMateEntityRef(v.entityB)) return false
  if (v.suppressed !== undefined && typeof v.suppressed !== 'boolean') return false
  return matePairSupportsOrient(matePairKind(v.entityA, v.entityB))
}

export function validateAngularMate(value: unknown): value is AngularMate {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.kind !== 'angular') return false
  if (typeof v.id !== 'string' || v.id.trim().length === 0) return false
  // Legacy: flipped boolean → alignment; nowe pliki mają alignment
  const hasAlignment = v.alignment === 'faceToFace' || v.alignment === 'sameDirection'
  const hasLegacyFlip = typeof v.flipped === 'boolean'
  if (!hasAlignment && !hasLegacyFlip) return false
  if (hasAlignment === false && v.alignment !== undefined) return false
  if (typeof v.angleDeg !== 'number' || !Number.isFinite(v.angleDeg)) return false
  if (!validateMateEntityRef(v.entityA) || !validateMateEntityRef(v.entityB)) return false
  if (v.suppressed !== undefined && typeof v.suppressed !== 'boolean') return false
  return matePairSupportsOrient(matePairKind(v.entityA, v.entityB))
}

/** Czy przywiązka jest wyłączona (nie wpływa na pozycje). */
export function isMateSuppressed(mate: AssemblyMate): boolean {
  return mate.suppressed === true
}

export function validateAssemblyMate(value: unknown): value is AssemblyMate {
  return validateParallelMate(value) || validatePerpendicularMate(value) || validateAngularMate(value)
}

export function createParallelMateId(): string {
  return `mate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const createMateId = createParallelMateId

/** Normalizacja odczytu z pliku — legacy planeA/planeB + parallelMode + ujemny offset. */
export function normalizeParallelMate(value: ParallelMate | Record<string, unknown>): ParallelMate {
  const v = value as Record<string, unknown>
  const parallelMode: ParallelMateMode = v.parallelMode === 'line' ? 'line' : 'plane'
  const rawA = v.entityA ?? v.planeA
  const rawB = v.entityB ?? v.planeB
  const entityA = readLegacyEntity(rawA, parallelMode)!
  const entityB = readLegacyEntity(rawB, parallelMode)!
  let offsetMm = Number(v.offsetMm)
  let flipped = v.flipped === true
  if (offsetMm < 0) {
    offsetMm = Math.abs(offsetMm)
    flipped = !flipped
  }
  const mate: ParallelMate = {
    id: String(v.id),
    kind: 'parallel',
    entityA,
    entityB,
    alignment: v.alignment === 'sameDirection' ? 'sameDirection' : 'faceToFace',
    offsetMm,
  }
  if (flipped) mate.flipped = true
  if (v.suppressed === true) mate.suppressed = true
  return mate
}

export function normalizePerpendicularMate(
  value: PerpendicularMate | Record<string, unknown>,
): PerpendicularMate {
  const v = value as Record<string, unknown>
  const mate: PerpendicularMate = {
    id: String(v.id),
    kind: 'perpendicular',
    entityA: v.entityA as MateEntityRef,
    entityB: v.entityB as MateEntityRef,
    flipped: v.flipped === true,
  }
  if (v.suppressed === true) mate.suppressed = true
  return mate
}

export function normalizeAngularMate(value: AngularMate | Record<string, unknown>): AngularMate {
  const v = value as Record<string, unknown>
  let alignment: MateAlignment =
    v.alignment === 'sameDirection' ? 'sameDirection' : 'faceToFace'
  // Migracja krótkiego okresu z flipped na alignment
  if (v.alignment !== 'faceToFace' && v.alignment !== 'sameDirection' && v.flipped === true) {
    alignment = 'sameDirection'
  }
  const mate: AngularMate = {
    id: String(v.id),
    kind: 'angular',
    entityA: v.entityA as MateEntityRef,
    entityB: v.entityB as MateEntityRef,
    angleDeg: Number(v.angleDeg),
    alignment,
  }
  if (v.suppressed === true) mate.suppressed = true
  return mate
}

export function normalizeAssemblyMate(value: AssemblyMate | Record<string, unknown>): AssemblyMate {
  const v = value as Record<string, unknown>
  if (v.kind === 'perpendicular') return normalizePerpendicularMate(v)
  if (v.kind === 'angular') return normalizeAngularMate(v)
  return normalizeParallelMate(v)
}

/** Czy para obsługuje Flip orientacji (normale / kierunki). */
export function matePairSupportsAlignment(pair: MatePairKind): boolean {
  return (
    pair === 'plane-plane' ||
    pair === 'line-line' ||
    pair === 'plane-line' ||
    pair === 'line-plane'
  )
}
