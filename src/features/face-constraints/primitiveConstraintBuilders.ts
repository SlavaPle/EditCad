import type { ConstFaceConstraint, MinMaxFaceConstraint, PanelAxisBounds } from './model'

export function repFacePair(ua: readonly number[], ub: readonly number[]): { a: number; b: number } {
  return { a: ua[0]!, b: ub[0]! }
}

export function buildMinMaxConstraint(
  id: string,
  bounds: PanelAxisBounds,
  elementAId: string,
  elementBId: string,
  ua: number[],
  ub: number[],
): MinMaxFaceConstraint {
  const { a, b } = repFacePair(ua, ub)
  return {
    id,
    type: 'minmax',
    facePair: { a, b },
    elementAId,
    elementBId,
    minMm: bounds.minMm ?? 0,
    maxMm: bounds.maxMm,
  }
}

export function buildConstConstraint(
  id: string,
  valueMm: number,
  elementAId: string,
  elementBId: string,
  ua: number[],
  ub: number[],
): ConstFaceConstraint {
  const { a, b } = repFacePair(ua, ub)
  return {
    id,
    type: 'const',
    facePair: { a, b },
    elementAId,
    elementBId,
    valueMm,
  }
}
