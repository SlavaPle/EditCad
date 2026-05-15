import type { BufferGeometry } from 'three'
import { analyzeTwoFaceStretch } from '../../lib/twoFaceStretch'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { partitionSelectionIntoCoplanarPatches } from '../model-selection/facePlaneSelection'
import { measurePreparedElementPairGapMm } from '../part-constraints/measurePairGapMm'
import { mergeTrianglesForPreparedElementPair } from '../part-constraints/mergeFacesForPreparedElementPair'
import type { FaceConstraint, ProfilFaceConstraint } from './model'
import { buildConstConstraint, buildMinMaxConstraint } from './primitiveConstraintBuilders'

export type ProfilInstallStretchStep = {
  mergedFaces: number[]
  targetMm: number
}

export type ProfilInstallBundle = {
  profil: ProfilFaceConstraint
  auxiliaryConstraints: FaceConstraint[]
  extraElements: PreparedModelElement[]
  stretchSteps: ProfilInstallStretchStep[]
}

export type ProfilInstallBundleFailure =
  | 'needTwoPlanarGroups'
  | 'missingFrozenElements'
  | 'invalidFrozenGap'

export type ProfilInstallBundleResult = ProfilInstallBundle | { ok: false; reason: ProfilInstallBundleFailure }

export function isProfilInstallBundleFailure(
  result: ProfilInstallBundleResult,
): result is { ok: false; reason: ProfilInstallBundleFailure } {
  return 'ok' in result && result.ok === false
}

function sortedPatch(patch: readonly number[]): number[] {
  return [...patch].sort((a, b) => a - b)
}

export function buildProfilInstallBundle(params: {
  geometry: BufferGeometry
  profilId: string
  stretchTriangles: readonly number[]
  stretchMaxMm: number
  stretchMinMm?: number
  frozen1ElementAId: string
  frozen1ElementBId: string
  frozen2ElementAId: string
  frozen2ElementBId: string
  preparedModelElements: readonly PreparedModelElement[]
}): ProfilInstallBundleResult {
  const {
    geometry,
    profilId,
    stretchTriangles,
    stretchMaxMm,
    stretchMinMm,
    frozen1ElementAId,
    frozen1ElementBId,
    frozen2ElementAId,
    frozen2ElementBId,
    preparedModelElements,
  } = params

  const patches = partitionSelectionIntoCoplanarPatches(geometry, stretchTriangles)
  if (patches.length !== 2) {
    return { ok: false, reason: 'needTwoPlanarGroups' }
  }

  const gap1 = measurePreparedElementPairGapMm(
    geometry,
    frozen1ElementAId,
    frozen1ElementBId,
    preparedModelElements,
  )
  const gap2 = measurePreparedElementPairGapMm(
    geometry,
    frozen2ElementAId,
    frozen2ElementBId,
    preparedModelElements,
  )
  if (gap1 === null || gap2 === null) {
    return { ok: false, reason: 'missingFrozenElements' }
  }
  if (!(gap1 > 0 && gap2 > 0)) {
    return { ok: false, reason: 'invalidFrozenGap' }
  }

  const stamp = Math.random().toString(36).slice(2, 8)
  const ua = sortedPatch(patches[0]!)
  const ub = sortedPatch(patches[1]!)
  const stretchAId = `el-${stamp}-profil-s-a`
  const stretchBId = `el-${stamp}-profil-s-b`
  const stretchMinMaxId = `${profilId}-stretch-minmax`
  const frozen1ConstId = `${profilId}-frozen1-const`
  const frozen2ConstId = `${profilId}-frozen2-const`

  const stretchBounds = {
    maxMm: stretchMaxMm,
    ...(stretchMinMm !== undefined ? { minMm: stretchMinMm } : {}),
  }
  const stretchMinMax = buildMinMaxConstraint(
    stretchMinMaxId,
    stretchBounds,
    stretchAId,
    stretchBId,
    ua,
    ub,
  )

  const merged1 = mergeTrianglesForPreparedElementPair(
    preparedModelElements,
    frozen1ElementAId,
    frozen1ElementBId,
  )
  const merged2 = mergeTrianglesForPreparedElementPair(
    preparedModelElements,
    frozen2ElementAId,
    frozen2ElementBId,
  )
  if (!merged1?.length || !merged2?.length) {
    return { ok: false, reason: 'missingFrozenElements' }
  }
  const patches1 = partitionSelectionIntoCoplanarPatches(geometry, merged1)
  const patches2 = partitionSelectionIntoCoplanarPatches(geometry, merged2)
  if (patches1.length !== 2 || patches2.length !== 2) {
    return { ok: false, reason: 'needTwoPlanarGroups' }
  }

  const frozen1Const = buildConstConstraint(
    frozen1ConstId,
    gap1,
    frozen1ElementAId,
    frozen1ElementBId,
    sortedPatch(patches1[0]!),
    sortedPatch(patches1[1]!),
  )
  const frozen2Const = buildConstConstraint(
    frozen2ConstId,
    gap2,
    frozen2ElementAId,
    frozen2ElementBId,
    sortedPatch(patches2[0]!),
    sortedPatch(patches2[1]!),
  )

  const repA = ua[0]!
  const repB = ub[0]!
  const profil: ProfilFaceConstraint = {
    id: profilId,
    type: 'profil',
    facePair: { a: repA, b: repB },
    elementAId: stretchAId,
    elementBId: stretchBId,
    valueMm: stretchMaxMm,
    ...(stretchMinMm !== undefined ? { stretchMinMm } : {}),
    frozen1: { elementAId: frozen1ElementAId, elementBId: frozen1ElementBId },
    frozen2: { elementAId: frozen2ElementAId, elementBId: frozen2ElementBId },
    stretchMinMaxId,
    frozen1ConstId,
    frozen2ConstId,
  }

  const gapAn = analyzeTwoFaceStretch(geometry, [...stretchTriangles])
  if (!gapAn.ok) {
    return { ok: false, reason: 'needTwoPlanarGroups' }
  }
  const floor = stretchMinMm !== undefined && stretchMinMm > 0 ? stretchMinMm : 1e-4
  const targetMm = Math.min(Math.max(gapAn.gapMm, floor), stretchMaxMm)

  return {
    profil,
    auxiliaryConstraints: [stretchMinMax, frozen1Const, frozen2Const],
    extraElements: [
      { id: stretchAId, faceIndices: ua },
      { id: stretchBId, faceIndices: ub },
    ],
    stretchSteps: [{ mergedFaces: [...stretchTriangles], targetMm }],
  }
}

export function removeProfilAndAuxiliaryConstraints(
  list: readonly FaceConstraint[],
  profilId: string,
): FaceConstraint[] {
  const profil = list.find((c) => c.id === profilId)
  if (!profil || profil.type !== 'profil') {
    return list.filter((c) => c.id !== profilId)
  }
  const drop = new Set<string>([profilId])
  if (profil.stretchMinMaxId) drop.add(profil.stretchMinMaxId)
  if (profil.frozen1ConstId) drop.add(profil.frozen1ConstId)
  if (profil.frozen2ConstId) drop.add(profil.frozen2ConstId)
  return list.filter((c) => !drop.has(c.id))
}
