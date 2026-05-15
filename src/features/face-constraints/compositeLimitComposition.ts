import type {
  BlockFaceConstraint,
  FaceConstraint,
  PanelFaceConstraint,
  ProfilFaceConstraint,
} from './model'

/** Pojedynczy element składu PANEL / PROFIL / BLOCK w pliku ograniczeń. */
export type CompositePrimitiveKind = 'const' | 'minmax'

/** Kanoniczny skład PANEL: grubość CONST + MINMAX (X) + MINMAX (Y). */
export const PANEL_COMPOSITION: readonly CompositePrimitiveKind[] = ['const', 'minmax', 'minmax']

/** Kanoniczny skład PROFIL: MINMAX (rozciąganie) + CONST (zamrożenie 1) + CONST (zamrożenie 2). */
export const PROFIL_COMPOSITION: readonly CompositePrimitiveKind[] = ['minmax', 'const', 'const']

/** Kanoniczny skład BLOCK: trzy osie zamrożone jako CONST. */
export const BLOCK_COMPOSITION: readonly CompositePrimitiveKind[] = ['const', 'const', 'const']

export function classifyConstraintPrimitive(c: FaceConstraint): CompositePrimitiveKind | null {
  if (c.type === 'const') return 'const'
  if (c.type === 'minmax') return 'minmax'
  return null
}

export function primitiveKindsFromConstraints(constraints: readonly FaceConstraint[]): CompositePrimitiveKind[] {
  const kinds: CompositePrimitiveKind[] = []
  for (const c of constraints) {
    const k = classifyConstraintPrimitive(c)
    if (k) kinds.push(k)
  }
  return kinds
}

export function matchesComposition(
  actual: readonly CompositePrimitiveKind[],
  expected: readonly CompositePrimitiveKind[],
): boolean {
  if (actual.length !== expected.length) return false
  return actual.every((k, i) => k === expected[i])
}

export function panelExpandedPrimitiveKinds(
  panel: PanelFaceConstraint,
  all: readonly FaceConstraint[],
): CompositePrimitiveKind[] {
  const ids = new Set<string>()
  if (panel.thicknessConstId) ids.add(panel.thicknessConstId)
  if (panel.panelXMinMaxId) ids.add(panel.panelXMinMaxId)
  if (panel.panelYMinMaxId) ids.add(panel.panelYMinMaxId)
  return primitiveKindsFromConstraints(all.filter((c) => ids.has(c.id)))
}

export function profilExpandedPrimitiveKinds(
  profil: ProfilFaceConstraint,
  all: readonly FaceConstraint[],
): CompositePrimitiveKind[] {
  const ids = new Set<string>()
  if (profil.stretchMinMaxId) ids.add(profil.stretchMinMaxId)
  if (profil.frozen1ConstId) ids.add(profil.frozen1ConstId)
  if (profil.frozen2ConstId) ids.add(profil.frozen2ConstId)
  if (ids.size > 0) {
    return primitiveKindsFromConstraints(all.filter((c) => ids.has(c.id)))
  }
  return profilLogicalPrimitiveKinds(profil)
}

/** Gdy PROFIL nie ma jeszcze rozbitych wpisów — logiczny skład z pól profil. */
export function profilLogicalPrimitiveKinds(_profil: ProfilFaceConstraint): CompositePrimitiveKind[] {
  return [...PROFIL_COMPOSITION]
}

export function blockExpandedPrimitiveKinds(
  block: BlockFaceConstraint,
  all: readonly FaceConstraint[],
): CompositePrimitiveKind[] {
  const ids = [block.axis0ConstId, block.axis1ConstId, block.axis2ConstId].filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  )
  if (ids.length === 0) return []
  return primitiveKindsFromConstraints(all.filter((c) => ids.includes(c.id)))
}

export function auxiliaryPrimitiveKinds(auxiliary: readonly FaceConstraint[]): CompositePrimitiveKind[] {
  return primitiveKindsFromConstraints(auxiliary)
}

const PRIMITIVE_LIMIT_TYPES = new Set<FaceConstraint['type']>(['const', 'min', 'max', 'minmax'])

export function isPrimitiveLimitType(type: FaceConstraint['type']): boolean {
  return PRIMITIVE_LIMIT_TYPES.has(type)
}

/** Id wpisów const / minmax powiązanych z PANEL, PROFIL lub BLOCK. */
export function collectCompositeAuxiliaryConstraintIds(
  constraints: readonly FaceConstraint[],
): Set<string> {
  const ids = new Set<string>()
  for (const c of constraints) {
    if (c.type === 'panel') {
      if (c.thicknessConstId) ids.add(c.thicknessConstId)
      if (c.panelXMinMaxId) ids.add(c.panelXMinMaxId)
      if (c.panelYMinMaxId) ids.add(c.panelYMinMaxId)
    } else if (c.type === 'profil') {
      if (c.stretchMinMaxId) ids.add(c.stretchMinMaxId)
      if (c.frozen1ConstId) ids.add(c.frozen1ConstId)
      if (c.frozen2ConstId) ids.add(c.frozen2ConstId)
    } else if (c.type === 'block') {
      if (c.axis0ConstId) ids.add(c.axis0ConstId)
      if (c.axis1ConstId) ids.add(c.axis1ConstId)
      if (c.axis2ConstId) ids.add(c.axis2ConstId)
    }
  }
  return ids
}

export function hasCompositeLimitInList(constraints: readonly FaceConstraint[]): boolean {
  return constraints.some((c) => c.type === 'panel' || c.type === 'profil' || c.type === 'block')
}

/** Czy pokazywać limit na liście lewego panelu (ukrywa składowe const/minmax kompozytów). */
export function isVisibleInLeftPanelLimitList(
  constraint: FaceConstraint,
  allConstraints: readonly FaceConstraint[],
): boolean {
  if (!hasCompositeLimitInList(allConstraints)) return true
  if (!isPrimitiveLimitType(constraint.type)) return true
  return !collectCompositeAuxiliaryConstraintIds(allConstraints).has(constraint.id)
}

export function filterConstraintsForLeftPanelList(
  constraints: readonly FaceConstraint[],
): FaceConstraint[] {
  return constraints.filter((c) => isVisibleInLeftPanelLimitList(c, constraints))
}
