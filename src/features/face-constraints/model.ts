export type FaceConstraintType = 'min' | 'max' | 'const' | 'profil' | 'block' | 'panel'

export type FaceRefPair = {
  a: number
  b: number
}

export type FaceConstraintBase = {
  id: string
  type: FaceConstraintType
  facePair: FaceRefPair | null
}

export type MinFaceConstraint = FaceConstraintBase & {
  type: 'min'
  valueMm: number
}

export type MaxFaceConstraint = FaceConstraintBase & {
  type: 'max'
  valueMm: number
}

export type ConstFaceConstraint = FaceConstraintBase & {
  type: 'const'
  valueMm: number
}

export type ProfilFaceConstraint = FaceConstraintBase & {
  type: 'profil'
  valueMm: number
}

export type BlockFaceConstraint = FaceConstraintBase & {
  type: 'block'
}

export type PanelFaceConstraint = FaceConstraintBase & {
  type: 'panel'
  thicknessMm: number
  minSizeMm: {
    x: number
    y: number
  }
  maxSizeMm: {
    x: number
    y: number
  }
}

export type FaceConstraint =
  | MinFaceConstraint
  | MaxFaceConstraint
  | ConstFaceConstraint
  | ProfilFaceConstraint
  | BlockFaceConstraint
  | PanelFaceConstraint

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseFacePair(value: unknown): FaceRefPair | null {
  if (value === null) return null
  if (!isObject(value)) return null
  const a = value.a
  const b = value.b
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a === b) return null
  return { a, b }
}

function parsePanelSize(value: unknown): { x: number; y: number } | null {
  if (!isObject(value)) return null
  if (!isPositiveNumber(value.x) || !isPositiveNumber(value.y)) return null
  return { x: value.x, y: value.y }
}

function validatePanelRange(
  minSizeMm: { x: number; y: number },
  maxSizeMm: { x: number; y: number },
): boolean {
  if (!isPositiveNumber(minSizeMm.x) || !isPositiveNumber(minSizeMm.y)) return false
  if (!isPositiveNumber(maxSizeMm.x) || !isPositiveNumber(maxSizeMm.y)) return false
  if (minSizeMm.x > maxSizeMm.x) return false
  if (minSizeMm.y > maxSizeMm.y) return false
  return true
}

export function validateFaceConstraint(constraint: FaceConstraint): boolean {
  if (!constraint.id.trim()) return false
  if (constraint.type !== 'block' && constraint.type !== 'panel' && constraint.facePair === null) return false
  if (constraint.type === 'block' && constraint.facePair !== null) return false

  if (constraint.type === 'min' || constraint.type === 'max' || constraint.type === 'const' || constraint.type === 'profil') {
    return isPositiveNumber(constraint.valueMm)
  }

  if (constraint.type === 'panel') {
    return (
      isPositiveNumber(constraint.thicknessMm) &&
      validatePanelRange(constraint.minSizeMm, constraint.maxSizeMm)
    )
  }

  return true
}

export function parseFaceConstraint(value: unknown): FaceConstraint | null {
  if (!isObject(value)) return null
  if (typeof value.id !== 'string' || typeof value.type !== 'string') return null

  const facePair = parseFacePair(value.facePair)
  const common = { id: value.id, facePair }

  switch (value.type) {
    case 'min':
    case 'max':
    case 'const':
    case 'profil': {
      if (!isPositiveNumber(value.valueMm)) return null
      const out = { ...common, type: value.type, valueMm: value.valueMm } as FaceConstraint
      return validateFaceConstraint(out) ? out : null
    }
    case 'block': {
      const out: BlockFaceConstraint = { ...common, type: 'block', facePair: null }
      return validateFaceConstraint(out) ? out : null
    }
    case 'panel': {
      if (!isPositiveNumber(value.thicknessMm)) return null
      const minSizeMm = parsePanelSize(value.minSizeMm)
      const maxSizeMm = parsePanelSize(value.maxSizeMm)
      if (!minSizeMm || !maxSizeMm) return null
      const out: PanelFaceConstraint = {
        ...common,
        type: 'panel',
        thicknessMm: value.thicknessMm,
        minSizeMm,
        maxSizeMm,
      }
      return validateFaceConstraint(out) ? out : null
    }
    default:
      return null
  }
}

export function parseFaceConstraintList(value: unknown): FaceConstraint[] | null {
  if (!Array.isArray(value)) return null
  const parsed: FaceConstraint[] = []
  for (const item of value) {
    const c = parseFaceConstraint(item)
    if (!c) return null
    parsed.push(c)
  }
  return parsed
}
