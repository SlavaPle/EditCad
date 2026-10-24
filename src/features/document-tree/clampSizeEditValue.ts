import type { FaceConstraintType } from '../face-constraints/model'

export type ClampSizeEditValueInput = {
  value: number
  limitType: FaceConstraintType | 'free'
  minMm?: number
  maxMm?: number
}

/**
 * Walidacja / clamp wartości mm względem typu limitu.
 * null = niepoprawna wartość (nie-skończona lub ≤ 0).
 */
export function clampSizeEditValue(input: ClampSizeEditValueInput): number | null {
  const { value, limitType, minMm, maxMm } = input
  if (!Number.isFinite(value) || value <= 0) return null

  if (limitType === 'free') return value

  if (limitType === 'const') {
    // Wartość CONST nie jest zmieniana w panelu (disabled) — zwracamy bez zmian.
    return value
  }

  if (limitType === 'min') {
    const lo = minMm != null && Number.isFinite(minMm) ? minMm : 0
    return Math.max(value, lo > 0 ? lo : value)
  }

  if (limitType === 'max') {
    if (maxMm != null && Number.isFinite(maxMm) && maxMm > 0) {
      return Math.min(value, maxMm)
    }
    return value
  }

  if (limitType === 'minmax') {
    let v = value
    if (minMm != null && Number.isFinite(minMm)) v = Math.max(v, minMm)
    if (maxMm != null && Number.isFinite(maxMm) && maxMm > 0) v = Math.min(v, maxMm)
    if (v <= 0) return null
    return v
  }

  return value
}

/** Czy pole wartości powinno być „muted” (szare) — jest aktywny limit. */
export function isSizeValueFieldMuted(limitType: FaceConstraintType | 'free'): boolean {
  return limitType !== 'free'
}

/** Czy pole wartości jest zablokowane (CONST). */
export function isSizeValueFieldDisabled(limitType: FaceConstraintType | 'free'): boolean {
  return limitType === 'const'
}
