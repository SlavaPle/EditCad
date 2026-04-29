export const PREPARED_ELEMENT_FORMAT = 'editcad.prepared-element' as const
export const PREPARED_ELEMENT_VERSION = 1 as const
import {
  parseFaceConstraintsForPreparedFile,
} from '../features/face-constraints/codec'
import type { FaceConstraint } from '../features/face-constraints/model'

export type StretchAxis = 'x' | 'y' | 'z'

export type StretchLimit = {
  axis: StretchAxis
  maxMm: number
}

export type FixedConstraints = {
  mode: 'fixed'
  faceConstraints?: FaceConstraint[]
}

export type Stretch1DConstraints = {
  mode: 'stretch1d'
  limits: [StretchLimit]
  faceConstraints?: FaceConstraint[]
}

export type Stretch2DConstraints = {
  mode: 'stretch2d'
  limits: [StretchLimit, StretchLimit]
  faceConstraints?: FaceConstraint[]
}

export type PreparedElementConstraints =
  | FixedConstraints
  | Stretch1DConstraints
  | Stretch2DConstraints

export type PreparedElementGeometry = {
  format: 'stl-ascii'
  data: string
}

export type PreparedElementFile = {
  format: typeof PREPARED_ELEMENT_FORMAT
  version: typeof PREPARED_ELEMENT_VERSION
  name: string
  constraints: PreparedElementConstraints
  geometry: PreparedElementGeometry
}

export type ParsePreparedElementResult =
  | { ok: true; file: PreparedElementFile }
  | { ok: false; error: string }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseStretchLimit(value: unknown): StretchLimit | null {
  if (!isObject(value)) return null
  const axis = value.axis
  const maxMm = value.maxMm
  if (axis !== 'x' && axis !== 'y' && axis !== 'z') return null
  if (typeof maxMm !== 'number' || !Number.isFinite(maxMm) || maxMm <= 0) return null
  return { axis, maxMm }
}

function validateDistinctAxes(limits: readonly StretchLimit[]): boolean {
  const seen = new Set<StretchAxis>()
  for (const limit of limits) {
    if (seen.has(limit.axis)) return false
    seen.add(limit.axis)
  }
  return true
}

function parseConstraints(value: unknown): PreparedElementConstraints | null {
  if (!isObject(value) || typeof value.mode !== 'string') return null
  const faceConstraints = parseFaceConstraintsForPreparedFile(value.faceConstraints)
  if (faceConstraints === null) return null
  const mode = value.mode
  if (mode === 'fixed') {
    return { mode: 'fixed', faceConstraints }
  }
  if (mode !== 'stretch1d' && mode !== 'stretch2d') {
    return null
  }
  if (!Array.isArray(value.limits)) return null
  const parsedLimits = value.limits.map(parseStretchLimit)
  if (parsedLimits.some((it) => it === null)) return null
  const limits = parsedLimits as StretchLimit[]
  if (mode === 'stretch1d') {
    if (limits.length !== 1) return null
    return { mode: 'stretch1d', limits: [limits[0]], faceConstraints }
  }
  if (limits.length !== 2) return null
  if (!validateDistinctAxes(limits)) return null
  return { mode: 'stretch2d', limits: [limits[0], limits[1]], faceConstraints }
}

function parseGeometry(value: unknown): PreparedElementGeometry | null {
  if (!isObject(value)) return null
  if (value.format !== 'stl-ascii') return null
  if (typeof value.data !== 'string' || value.data.trim().length === 0) return null
  return { format: 'stl-ascii', data: value.data }
}

export function validatePreparedElementFile(value: unknown): ParsePreparedElementResult {
  if (!isObject(value)) {
    return { ok: false, error: 'Prepared element must be an object.' }
  }
  if (value.format !== PREPARED_ELEMENT_FORMAT) {
    return { ok: false, error: 'Invalid prepared element format identifier.' }
  }
  if (value.version !== PREPARED_ELEMENT_VERSION) {
    return { ok: false, error: 'Unsupported prepared element version.' }
  }
  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    return { ok: false, error: 'Prepared element name is required.' }
  }
  const constraints = parseConstraints(value.constraints)
  if (!constraints) {
    return { ok: false, error: 'Invalid constraints in prepared element file.' }
  }
  const geometry = parseGeometry(value.geometry)
  if (!geometry) {
    return { ok: false, error: 'Invalid geometry payload in prepared element file.' }
  }
  return {
    ok: true,
    file: {
      format: PREPARED_ELEMENT_FORMAT,
      version: PREPARED_ELEMENT_VERSION,
      name: value.name,
      constraints,
      geometry,
    },
  }
}

export function serializePreparedElementFile(file: PreparedElementFile): string {
  return JSON.stringify(file, null, 2)
}

export function parsePreparedElementFile(content: string): ParsePreparedElementResult {
  try {
    const json = JSON.parse(content) as unknown
    return validatePreparedElementFile(json)
  } catch {
    return { ok: false, error: 'Prepared element file is not valid JSON.' }
  }
}
