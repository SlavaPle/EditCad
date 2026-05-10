import type { BufferGeometry } from 'three'
import type { FaceConstraint } from '../face-constraints/model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { MIN_STRETCH_GAP_FLOOR_MM } from './stretchBasicEnvelopeForMergedPair'
import { mergedFacesMatchProfilStretchAxis } from './matchesProfilStretchAxis'

/** Pas dozwolonego rozciągania PROFIL (MIN…MAX lub floor…MAX) dla bieżącej par. */
export function stretchProfilBandForMergedPair(
  geometry: BufferGeometry,
  mergedFaces: readonly number[],
  faceConstraints: readonly FaceConstraint[] | undefined,
  elements: readonly PreparedModelElement[] | undefined,
): { lower: number; upper: number } | null {
  const els = elements ?? []
  const list = faceConstraints
  if (!list?.length) return null

  for (const c of list) {
    if (c.type !== 'profil') continue
    if (!mergedFacesMatchProfilStretchAxis(geometry, mergedFaces, els, c)) continue

    const lower =
      typeof c.stretchMinMm === 'number' && Number.isFinite(c.stretchMinMm) && c.stretchMinMm > 0
        ? c.stretchMinMm
        : MIN_STRETCH_GAP_FLOOR_MM

    const upper = c.valueMm
    if (!(upper > 0 && Number.isFinite(upper))) continue
    if (lower > upper + 1e-4) continue
    return { lower, upper }
  }
  return null
}
