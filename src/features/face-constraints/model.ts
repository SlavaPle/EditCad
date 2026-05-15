export type FaceConstraintType = 'min' | 'max' | 'minmax' | 'const' | 'profil' | 'block' | 'panel'

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

/** Jedna para: dolna i górna granica zazoru (MIN domyślnie 0 przy imporcie lub w UI). */
export type MinMaxFaceConstraint = FaceConstraintBase & {
  type: 'minmax'
  minMm: number
  maxMm: number
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

/** Jeden „zamrożony” wymiar w PROFIL (jak CONST): para elementów albo edgeVertexPair. */
export type ProfilFrozenSlotStored = {
  elementAId?: string
  elementBId?: string
  edgeVertexPair?: ConstEdgeVertexPair
}

export type ProfilFaceConstraint = FaceConstraintBase & {
  type: 'profil'
  /** Górny limit rozciągnięcia na wskazanej parze (MAX). */
  valueMm: number
  /** Dolny limit tej samej pary rozciągania (jak MIN); opcjonalny — combo 4 parametrów z dwoma zamrożeniami. */
  stretchMinMm?: number
  /** Dwa wymiary „śledzone” jak CONST; brak obu = stary zapis PROFIL (tylko MAX + para rozciągania). */
  frozen1?: ProfilFrozenSlotStored
  frozen2?: ProfilFrozenSlotStored
  /** MINMAX na parze rozciągania. */
  stretchMinMaxId?: string
  frozen1ConstId?: string
  frozen2ConstId?: string
}

export type BlockFaceConstraint = FaceConstraintBase & {
  type: 'block'
  axis0ConstId?: string
  axis1ConstId?: string
  axis2ConstId?: string
  axis0ElementAId?: string
  axis0ElementBId?: string
  axis1ElementAId?: string
  axis1ElementBId?: string
  axis2ElementAId?: string
  axis2ElementBId?: string
}

/** Jedna oś panelu (X lub Y): MAX wymagane; MIN opcjonalne. */
export type PanelAxisBounds = {
  maxMm: number
  minMm?: number
}

/** PANEL: jak mierzone są szerokości X/Y — konkretne pary elementów albo stare pudło AABB. */
export type PanelMeasureMode = 'facePairs' | 'bboxExtents'

export type PanelFaceConstraint = FaceConstraintBase & {
  type: 'panel'
  thicknessMm: number
  panelX: PanelAxisBounds
  panelY: PanelAxisBounds
  /** JSON/UI: gdy true — granice mm osi Y = jak panelX; pary pomiarowe X/Y mogą być różne. */
  ySameAsX: boolean
  panelMeasureMode: PanelMeasureMode
  /** Para elementów dla osi panelX — wymagane przy panelMeasureMode === 'facePairs'. */
  panelXElementAId?: string
  panelXElementBId?: string
  panelYElementAId?: string
  panelYElementBId?: string
  /** Powiązany CONST dla grubości (para thicknessElement*). */
  thicknessConstId?: string
  thicknessElementAId?: string
  thicknessElementBId?: string
  /** MINMAX dla osi X / Y (pary panelX* / panelY*). */
  panelXMinMaxId?: string
  panelYMinMaxId?: string
}

export type FaceConstraint =
  | MinFaceConstraint
  | MaxFaceConstraint
  | MinMaxFaceConstraint
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

/** Zakres luzu rozciągania PROFIL: sam MAX albo MIN…MAX (mm). */
export function formatProfilStretchGapLabelMm(c: ProfilFaceConstraint): string {
  if (c.stretchMinMm !== undefined) return `${c.stretchMinMm}…${c.valueMm}`
  return `${c.valueMm}`
}

function parseTrimmedPanelElementId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const s = value.trim()
  return s.length > 0 ? s : undefined
}

function inferPanelMeasureModeFromIds(payload: Record<string, unknown>): PanelMeasureMode {
  const xa = parseTrimmedPanelElementId(payload.panelXElementAId)
  const xb = parseTrimmedPanelElementId(payload.panelXElementBId)
  const ya = parseTrimmedPanelElementId(payload.panelYElementAId)
  const yb = parseTrimmedPanelElementId(payload.panelYElementBId)
  if (xa && xb && ya && yb) return 'facePairs'
  return 'bboxExtents'
}

function resolvePanelMeasureModeRead(payload: Record<string, unknown>): PanelMeasureMode {
  const ex = payload.panelMeasureMode
  if (ex === 'bboxExtents' || ex === 'facePairs') return ex
  return inferPanelMeasureModeFromIds(payload)
}

export function panelHasCompleteFacePairIds(c: PanelFaceConstraint): boolean {
  return Boolean(
    c.panelXElementAId?.trim() &&
      c.panelXElementBId?.trim() &&
      c.panelYElementAId?.trim() &&
      c.panelYElementBId?.trim(),
  )
}

/** Pary elementów X i Y muszą być różne (ta sama para id w dowolnej kolejności = ten sam pomiar). */
export function arePanelSpanPreparedPairIdsDistinct(
  xa: string,
  xb: string,
  ya: string,
  yb: string,
): boolean {
  const ta = xa.trim()
  const tb = xb.trim()
  const ua = ya.trim()
  const ub = yb.trim()
  if (!ta || !tb || !ua || !ub) return false
  const sx = new Set([ta, tb])
  const sy = new Set([ua, ub])
  if (sx.size !== 2 || sy.size !== 2) return false
  if (sx.size !== sy.size) return true
  for (const id of sx) {
    if (!sy.has(id)) return true
  }
  return false
}

function panelXYFacePairsAreDistinctPreparedElements(c: PanelFaceConstraint): boolean {
  if (c.panelMeasureMode !== 'facePairs' || !panelHasCompleteFacePairIds(c)) return true
  return arePanelSpanPreparedPairIdsDistinct(
    c.panelXElementAId!,
    c.panelXElementBId!,
    c.panelYElementAId!,
    c.panelYElementBId!,
  )
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

function validConstEdgeFrozen(ev: ConstEdgeVertexPair): boolean {
  return (
    Number.isInteger(ev.va) &&
    Number.isInteger(ev.vb) &&
    ev.va >= 0 &&
    ev.vb >= 0 &&
    ev.va !== ev.vb
  )
}

/** Czy wpis zamrożonego wymiaru PROFIL jest poprawny (para elementów albo obręcz krawędzi). */
export function validateProfilFrozenSlotStored(slot: ProfilFrozenSlotStored): boolean {
  const ev = slot.edgeVertexPair
  const pairOk =
    typeof slot.elementAId === 'string' &&
    slot.elementAId.trim().length > 0 &&
    typeof slot.elementBId === 'string' &&
    slot.elementBId.trim().length > 0
  const edgeOk = ev !== undefined && validConstEdgeFrozen(ev)
  if (pairOk && edgeOk) return false
  if (pairOk) return true
  if (edgeOk) return true
  return false
}

export function parseProfilFrozenSlotFromPayload(raw: unknown): ProfilFrozenSlotStored | undefined {
  if (!isObject(raw)) return undefined
  let edgeVertexPair: ConstEdgeVertexPair | undefined
  const nestedEv = raw.edgeVertexPair
  if (isObject(nestedEv)) {
    const vaCand = typeof nestedEv.va === 'number' ? nestedEv.va : typeof nestedEv.a === 'number' ? nestedEv.a : undefined
    const vbCand = typeof nestedEv.vb === 'number' ? nestedEv.vb : typeof nestedEv.b === 'number' ? nestedEv.b : undefined
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
  const ea = typeof raw.elementAId === 'string' ? raw.elementAId.trim() : ''
  const eb = typeof raw.elementBId === 'string' ? raw.elementBId.trim() : ''
  const slot: ProfilFrozenSlotStored = {
    elementAId: ea.length ? ea : undefined,
    elementBId: eb.length ? eb : undefined,
    edgeVertexPair,
  }
  if (!slot.elementAId && !slot.elementBId && !slot.edgeVertexPair) return undefined
  return validateProfilFrozenSlotStored(slot) ? slot : undefined
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

  if (constraint.type === 'profil') {
    if (!isPositiveNumber(constraint.valueMm)) return false
    if (constraint.stretchMinMm !== undefined) {
      if (!isPositiveNumber(constraint.stretchMinMm)) return false
      if (constraint.stretchMinMm > constraint.valueMm) return false
    }
    const h1 = constraint.frozen1 !== undefined && constraint.frozen1 !== null
    const h2 = constraint.frozen2 !== undefined && constraint.frozen2 !== null
    if (h1 !== h2) return false
    if (!h1 && !h2) return true
    return !!(
      constraint.frozen1 &&
      constraint.frozen2 &&
      validateProfilFrozenSlotStored(constraint.frozen1) &&
      validateProfilFrozenSlotStored(constraint.frozen2)
    )
  }

  if (constraint.type === 'minmax') {
    const minOk = typeof constraint.minMm === 'number' && Number.isFinite(constraint.minMm) && constraint.minMm >= 0
    if (!minOk || !isPositiveNumber(constraint.maxMm)) return false
    return constraint.minMm <= constraint.maxMm + 1e-9
  }

  if (constraint.type === 'min' || constraint.type === 'max' || constraint.type === 'const') {
    return isPositiveNumber(constraint.valueMm)
  }

  if (constraint.type === 'panel') {
    if (
      !isPositiveNumber(constraint.thicknessMm) ||
      !validatePanelAxis(constraint.panelX) ||
      !validatePanelAxis(constraint.panelY)
    ) {
      return false
    }
    if (constraint.panelMeasureMode === 'bboxExtents') return true
    if (constraint.panelMeasureMode !== 'facePairs' || !panelHasCompleteFacePairIds(constraint)) return false
    return panelXYFacePairsAreDistinctPreparedElements(constraint)
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
    case 'minmax': {
      let minMm = 0
      const rawMin = value.minMm
      if (rawMin !== undefined && rawMin !== null) {
        if (typeof rawMin !== 'number' || !Number.isFinite(rawMin) || rawMin < 0) return null
        minMm = rawMin
      }
      if (!isPositiveNumber(value.maxMm)) return null
      const out: MinMaxFaceConstraint = { ...common, type: 'minmax', minMm, maxMm: value.maxMm }
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
      const frozen1 = parseProfilFrozenSlotFromPayload(value.frozen1)
      const frozen2 = parseProfilFrozenSlotFromPayload(value.frozen2)
      let stretchMinMm: number | undefined
      const rawMin = value.stretchMinMm
      if (rawMin !== undefined && rawMin !== null) {
        if (!isPositiveNumber(rawMin)) return null
        stretchMinMm = rawMin
      }
      const stretchMinMaxId =
        typeof value.stretchMinMaxId === 'string' ? value.stretchMinMaxId.trim() || undefined : undefined
      const frozen1ConstId =
        typeof value.frozen1ConstId === 'string' ? value.frozen1ConstId.trim() || undefined : undefined
      const frozen2ConstId =
        typeof value.frozen2ConstId === 'string' ? value.frozen2ConstId.trim() || undefined : undefined
      const out: ProfilFaceConstraint = {
        ...common,
        type: 'profil',
        valueMm: value.valueMm,
        stretchMinMm,
        frozen1,
        frozen2,
        stretchMinMaxId,
        frozen1ConstId,
        frozen2ConstId,
      }
      return validateFaceConstraint(out) ? out : null
    }
    case 'block': {
      const axis0ConstId =
        typeof value.axis0ConstId === 'string' ? value.axis0ConstId.trim() || undefined : undefined
      const axis1ConstId =
        typeof value.axis1ConstId === 'string' ? value.axis1ConstId.trim() || undefined : undefined
      const axis2ConstId =
        typeof value.axis2ConstId === 'string' ? value.axis2ConstId.trim() || undefined : undefined
      const out: BlockFaceConstraint = {
        ...common,
        type: 'block',
        facePair: null,
        axis0ConstId,
        axis1ConstId,
        axis2ConstId,
        axis0ElementAId: parseTrimmedPanelElementId(value.axis0ElementAId),
        axis0ElementBId: parseTrimmedPanelElementId(value.axis0ElementBId),
        axis1ElementAId: parseTrimmedPanelElementId(value.axis1ElementAId),
        axis1ElementBId: parseTrimmedPanelElementId(value.axis1ElementBId),
        axis2ElementAId: parseTrimmedPanelElementId(value.axis2ElementAId),
        axis2ElementBId: parseTrimmedPanelElementId(value.axis2ElementBId),
      }
      return validateFaceConstraint(out) ? out : null
    }
    case 'panel': {
      if (!isPositiveNumber(value.thicknessMm)) return null
      const panelX = parsePanelAxisModern(value.panelX)
      const panelY = parsePanelAxisModern(value.panelY)
      if (panelX && panelY) {
        const ySameAsX = typeof value.ySameAsX === 'boolean' ? value.ySameAsX : false
        const xa = parseTrimmedPanelElementId(value.panelXElementAId)
        const xb = parseTrimmedPanelElementId(value.panelXElementBId)
        const ya = parseTrimmedPanelElementId(value.panelYElementAId)
        const yb = parseTrimmedPanelElementId(value.panelYElementBId)
        const thicknessConstId =
          typeof value.thicknessConstId === 'string' ? value.thicknessConstId.trim() || undefined : undefined
        const thicknessElementAId = parseTrimmedPanelElementId(value.thicknessElementAId)
        const thicknessElementBId = parseTrimmedPanelElementId(value.thicknessElementBId)
        const panelXMinMaxId =
          typeof value.panelXMinMaxId === 'string' ? value.panelXMinMaxId.trim() || undefined : undefined
        const panelYMinMaxId =
          typeof value.panelYMinMaxId === 'string' ? value.panelYMinMaxId.trim() || undefined : undefined
        const mode = resolvePanelMeasureModeRead(value)
        if (mode === 'facePairs' && !(xa && xb && ya && yb)) return null

        const out: PanelFaceConstraint = {
          ...common,
          type: 'panel',
          thicknessMm: value.thicknessMm,
          panelX,
          panelY,
          ySameAsX,
          panelMeasureMode: mode,
          panelXElementAId: xa,
          panelXElementBId: xb,
          panelYElementAId: ya,
          panelYElementBId: yb,
          thicknessConstId,
          thicknessElementAId,
          thicknessElementBId,
          panelXMinMaxId,
          panelYMinMaxId,
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
        panelMeasureMode: 'bboxExtents',
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
