export type FaceConstraintType = 'min' | 'max' | 'const' | 'profil' | 'block' | 'panel'

export type FaceRefPair = {
  a: number
  b: number
}

export type FaceConstraintBase = {
  id: string
  type: FaceConstraintType
  facePair: FaceRefPair | null
  /** Referencje do wpisów modelElements w pliku ECDPRT — pełniejszy opis „elementów” niż sam facePair. */
  elementAId?: string
  elementBId?: string
}

export type MinFaceConstraint = FaceConstraintBase & {
  type: 'min'
  valueMm: number
}

export type MaxFaceConstraint = FaceConstraintBase & {
  type: 'max'
  valueMm: number
}

/** Opcjonalnie: długość między dwoma wierzchołkami siatki (np. „rebro” A) zamiast odległości między łatami. */
export type ConstEdgeVertexPair = {
  va: number
  vb: number
}

export type ConstFaceConstraint = FaceConstraintBase & {
  type: 'const'
  valueMm: number
  edgeVertexPair?: ConstEdgeVertexPair
}

export type ProfilFaceConstraint = FaceConstraintBase & {
  type: 'profil'
  valueMm: number
}

export type BlockFaceConstraint = FaceConstraintBase & {
  type: 'block'
}

/** Jedna oś panelu (X lub Y): MAX wymagane; MIN opcjonalne. */
export type PanelAxisBounds = {
  maxMm: number
  minMm?: number
}

export type PanelFaceConstraint = FaceConstraintBase & {
  type: 'panel'
  thicknessMm: number
  panelX: PanelAxisBounds
  panelY: PanelAxisBounds
  /** Zapis w JSON: jawna informacja UI; dane w panelY są zwielokrotnione, gdy true. */
  ySameAsX: boolean
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
  if (typeof a !== 'number' || typeof b !== 'number') return null
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a === b) return null
  return { a, b }
}

function parsePanelSize(value: unknown): { x: number; y: number } | null {
  if (!isObject(value)) return null
  if (!isPositiveNumber(value.x) || !isPositiveNumber(value.y)) return null
  return { x: value.x, y: value.y }
}

function validatePanelAxis(bounds: PanelAxisBounds): boolean {
  if (!isPositiveNumber(bounds.maxMm)) return false
  if (bounds.minMm === undefined) return true
  if (!isPositiveNumber(bounds.minMm)) return false
  return bounds.minMm <= bounds.maxMm
}

export function formatPanelAxisMm(bounds: PanelAxisBounds): string {
  if (bounds.minMm !== undefined) return `${bounds.minMm}…${bounds.maxMm}`
  return `≤${bounds.maxMm}`
}

export function formatPanelConstraintSummary(panel: PanelFaceConstraint): string {
  const sx = formatPanelAxisMm(panel.panelX)
  const sy = formatPanelAxisMm(panel.panelY)
  return `t=${panel.thicknessMm} mm · X:${sx} · Y:${sy}`
}

function parsePanelAxisModern(value: unknown): PanelAxisBounds | null {
  if (!isObject(value)) return null
  if (!isPositiveNumber(value.maxMm)) return null
  if (value.minMm === undefined || value.minMm === null) {
    return { maxMm: value.maxMm }
  }
  if (!isPositiveNumber(value.minMm)) return null
  if (value.minMm > value.maxMm) return null
  return { maxMm: value.maxMm, minMm: value.minMm }
}

function hasConstEdgeBinding(constraint: FaceConstraint): boolean {
  if (constraint.type !== 'const') return false
  const e = constraint.edgeVertexPair
  if (!e) return false
  return (
    Number.isInteger(e.va) &&
    Number.isInteger(e.vb) &&
    e.va >= 0 &&
    e.vb >= 0 &&
    e.va !== e.vb
  )
}

function hasPairBinding(constraint: FaceConstraint): boolean {
  const byFaces = constraint.facePair !== null
  const byElements = Boolean(constraint.elementAId?.trim() && constraint.elementBId?.trim())
  return byFaces || byElements
}

export function validateFaceConstraint(constraint: FaceConstraint): boolean {
  if (!constraint.id.trim()) return false
  if (constraint.type !== 'block' && constraint.type !== 'panel') {
    if (constraint.type === 'const') {
      if (!hasPairBinding(constraint) && !hasConstEdgeBinding(constraint)) return false
    } else if (!hasPairBinding(constraint)) {
      return false
    }
  }
  if (constraint.type === 'block' && constraint.facePair !== null) return false

  if (constraint.type === 'min' || constraint.type === 'max' || constraint.type === 'const' || constraint.type === 'profil') {
    return isPositiveNumber(constraint.valueMm)
  }

  if (constraint.type === 'panel') {
    return (
      isPositiveNumber(constraint.thicknessMm) &&
      validatePanelAxis(constraint.panelX) &&
      validatePanelAxis(constraint.panelY)
    )
  }

  return true
}

export function parseFaceConstraint(value: unknown): FaceConstraint | null {
  if (!isObject(value)) return null
  if (typeof value.id !== 'string' || typeof value.type !== 'string') return null

  const facePair = parseFacePair(value.facePair)
  const elementAId = typeof value.elementAId === 'string' ? value.elementAId : undefined
  const elementBId = typeof value.elementBId === 'string' ? value.elementBId : undefined
  const common = { id: value.id, facePair, elementAId, elementBId }

  switch (value.type) {
    case 'min':
    case 'max': {
      if (!isPositiveNumber(value.valueMm)) return null
      const out = { ...common, type: value.type, valueMm: value.valueMm } as MinFaceConstraint | MaxFaceConstraint
      return validateFaceConstraint(out) ? out : null
    }
    case 'const': {
      if (!isPositiveNumber(value.valueMm)) return null
      let edgeVertexPair: ConstEdgeVertexPair | undefined
      const ev = value.edgeVertexPair
      if (isObject(ev)) {
        const vaCand = typeof ev.va === 'number' ? ev.va : typeof ev.a === 'number' ? ev.a : undefined
        const vbCand = typeof ev.vb === 'number' ? ev.vb : typeof ev.b === 'number' ? ev.b : undefined
        if (
          typeof vaCand === 'number' &&
          typeof vbCand === 'number' &&
          Number.isInteger(vaCand) &&
          Number.isInteger(vbCand) &&
          vaCand >= 0 &&
          vbCand >= 0 &&
          vaCand !== vbCand
        ) {
          edgeVertexPair = { va: vaCand, vb: vbCand }
        }
      }
      const out = {
        ...common,
        type: 'const' as const,
        valueMm: value.valueMm,
        edgeVertexPair,
      }
      return validateFaceConstraint(out) ? out : null
    }
    case 'profil': {
      if (!isPositiveNumber(value.valueMm)) return null
      const out = { ...common, type: 'profil', valueMm: value.valueMm } as FaceConstraint
      return validateFaceConstraint(out) ? out : null
    }
    case 'block': {
      const out: BlockFaceConstraint = { ...common, type: 'block', facePair: null }
      return validateFaceConstraint(out) ? out : null
    }
    case 'panel': {
      if (!isPositiveNumber(value.thicknessMm)) return null
      const panelX = parsePanelAxisModern(value.panelX)
      const panelY = parsePanelAxisModern(value.panelY)
      if (panelX && panelY) {
        const ySameAsX = typeof value.ySameAsX === 'boolean' ? value.ySameAsX : false
        const out: PanelFaceConstraint = {
          ...common,
          type: 'panel',
          thicknessMm: value.thicknessMm,
          panelX,
          panelY,
          ySameAsX,
        }
        return validateFaceConstraint(out) ? out : null
      }
      const minSizeMm = parsePanelSize(value.minSizeMm)
      const maxSizeMm = parsePanelSize(value.maxSizeMm)
      if (!minSizeMm || !maxSizeMm) return null
      const legacy: PanelFaceConstraint = {
        ...common,
        type: 'panel',
        thicknessMm: value.thicknessMm,
        panelX: { minMm: minSizeMm.x, maxMm: maxSizeMm.x },
        panelY: { minMm: minSizeMm.y, maxMm: maxSizeMm.y },
        ySameAsX: false,
      }
      return validateFaceConstraint(legacy) ? legacy : null
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
