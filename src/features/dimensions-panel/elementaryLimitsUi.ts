import type { BufferGeometry } from 'three'
import type { FaceConstraint } from '../face-constraints/model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { measureConstraintPairGapMm } from '../part-constraints/measurePairGapMm'
import { isPrimitiveLimitType } from '../face-constraints/compositeLimitComposition'

export type ElementaryFaceConstraint = Extract<
  FaceConstraint,
  { type: 'min' | 'max' | 'minmax' | 'const' }
>

export type ElementaryPlaneGapRow = {
  constraint: ElementaryFaceConstraint
  gapMm: number
}

/** Limity elementarne zapisane jako rekordy const / min / max / minmax (bez panel/profil/block). */
export function filterElementaryFaceConstraints(
  constraints: readonly FaceConstraint[],
): ElementaryFaceConstraint[] {
  return constraints.filter((c): c is ElementaryFaceConstraint => isPrimitiveLimitType(c.type))
}

/** Wiersze z mierzalnym zasięgiem między płaszczyznami (analyzeTwoFaceStretch); bez geometrii lub bez pary ścian — pomijane. */
export function elementaryPlaneGapRows(
  geometry: BufferGeometry | null,
  constraints: readonly FaceConstraint[],
  elements: readonly PreparedModelElement[] | undefined,
): ElementaryPlaneGapRow[] {
  if (!geometry) return []
  const rows: ElementaryPlaneGapRow[] = []
  for (const c of filterElementaryFaceConstraints(constraints)) {
    const gapMm = measureConstraintPairGapMm(geometry, c, elements)
    if (gapMm !== null) rows.push({ constraint: c, gapMm })
  }
  return rows
}

export function formatPlaneGapMmLabel(n: number): string {
  return String(Number(n.toFixed(3)))
}
