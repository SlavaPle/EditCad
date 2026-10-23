/** Wybór pary ścian na dwóch detalach (faces-first przed otwarciem popup mate). */

import type { MateEntityHighlights } from './matePlaneFaceOverlay'
import type { MatePlaneRef } from './model'

export type MateFacePick = {
  partId: string
  /** Indeks trójkąta, z którego zbudowano łatkę. */
  seedFaceIndex: number
  /** Posortowana łata koplanarna. */
  faceIndices: readonly number[]
}

export type MateFacePair = {
  first: MateFacePick | null
  second: MateFacePick | null
}

export type MateFaceClickModifiers = {
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
}

export type ApplyMateFaceClickInput = {
  pair: MateFacePair
  partId: string
  seedFaceIndex: number
  faceIndices: readonly number[]
  modifiers: MateFaceClickModifiers
}

export type ApplyMateFaceClickResult =
  | { ok: true; pair: MateFacePair }
  | { ok: false; reason: 'samePart'; pair: MateFacePair }

export function createEmptyMateFacePair(): MateFacePair {
  return { first: null, second: null }
}

export function clearMateFacePair(): MateFacePair {
  return createEmptyMateFacePair()
}

export function mateFacePairIsComplete(pair: MateFacePair): boolean {
  return pair.first != null && pair.second != null && pair.first.partId !== pair.second.partId
}

export function isAdditiveMateFaceModifier(modifiers: MateFaceClickModifiers): boolean {
  return modifiers.shiftKey || modifiers.ctrlKey || modifiers.metaKey
}

function normalizePick(
  partId: string,
  seedFaceIndex: number,
  faceIndices: readonly number[],
): MateFacePick {
  const sorted = [...faceIndices].sort((a, b) => a - b)
  return {
    partId,
    seedFaceIndex,
    faceIndices: sorted,
  }
}

/**
 * Zwykły LKM → tylko jedna ściana (replace).
 * Shift/Ctrl/Meta + LKM → druga ściana wyłącznie na innym detalu.
 */
export function applyMateFaceClick(input: ApplyMateFaceClickInput): ApplyMateFaceClickResult {
  const pick = normalizePick(input.partId, input.seedFaceIndex, input.faceIndices)
  const additive = isAdditiveMateFaceModifier(input.modifiers)

  if (!additive) {
    return {
      ok: true,
      pair: { first: pick, second: null },
    }
  }

  const { first } = input.pair
  if (!first) {
    return {
      ok: true,
      pair: { first: pick, second: null },
    }
  }

  if (first.partId === pick.partId) {
    return { ok: false, reason: 'samePart', pair: input.pair }
  }

  return {
    ok: true,
    pair: { first, second: pick },
  }
}

function pickToPlaneRef(pick: MateFacePick): MatePlaneRef {
  return {
    partId: pick.partId,
    faceIndex: pick.faceIndices[0] ?? pick.seedFaceIndex,
    faceIndices: [...pick.faceIndices],
  }
}

/** Podświetlenie pary przed otwarciem popup (reuse overlay mates). */
export function mateFacePairToHighlights(pair: MateFacePair): MateEntityHighlights | null {
  if (!pair.first && !pair.second) return null
  return {
    entityA: pair.first ? pickToPlaneRef(pair.first) : null,
    entityB: pair.second ? pickToPlaneRef(pair.second) : null,
  }
}
