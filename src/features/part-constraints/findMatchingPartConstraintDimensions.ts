import type { BufferGeometry } from 'three'
import { analyzeTwoFaceStretch } from '../../lib/twoFaceStretch'
import type { FaceConstraint, PanelFaceConstraint, ProfilFaceConstraint } from '../face-constraints/model'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { PANEL_EDGE_TOL_MM } from './evaluatePanelConstraint'
import { mergedFacesMatchProfilStretchAxis } from './matchesProfilStretchAxis'

export function findMatchingProfilStretchConstraint(
  geometry: BufferGeometry,
  mergedFaces: readonly number[],
  faceConstraints: readonly FaceConstraint[] | undefined,
  elements: readonly PreparedModelElement[] | undefined,
): ProfilFaceConstraint | null {
  if (!faceConstraints?.length || !mergedFaces.length) return null

  const els = elements ?? []
  for (const c of faceConstraints) {
    if (c.type !== 'profil') continue
    if (!mergedFacesMatchProfilStretchAxis(geometry, mergedFaces, els, c)) continue
    return c
  }
  return null
}

export function findMatchingPanelThicknessConstraint(
  geometry: BufferGeometry,
  mergedFaces: readonly number[],
  faceConstraints: readonly FaceConstraint[] | undefined,
): PanelFaceConstraint | null {
  if (!faceConstraints?.length || !mergedFaces.length) return null

  const an = analyzeTwoFaceStretch(geometry, [...mergedFaces])
  if (!an.ok) return null

  for (const c of faceConstraints) {
    if (c.type !== 'panel') continue
    if (Math.abs(an.gapMm - c.thicknessMm) > PANEL_EDGE_TOL_MM) continue
    return c
  }
  return null
}
