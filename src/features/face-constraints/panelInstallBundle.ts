import type { BufferGeometry } from 'three'
import { analyzeTwoFaceStretch } from '../../lib/twoFaceStretch'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { partitionSelectionIntoCoplanarPatches } from '../model-selection/facePlaneSelection'
import { mergeTrianglesForPreparedElementPair } from '../part-constraints/mergeFacesForPreparedElementPair'
import type { FaceConstraint, PanelAxisBounds, PanelFaceConstraint } from './model'
import { buildConstConstraint, buildMinMaxConstraint } from './primitiveConstraintBuilders'

export type PanelInstallStretchStep = {
  mergedFaces: number[]
  targetMm: number
  panelThicknessMergedFaces?: number[]
}

export type PanelInstallBundle = {
  panel: PanelFaceConstraint
  auxiliaryConstraints: FaceConstraint[]
  extraElements: PreparedModelElement[]
  stretchSteps: PanelInstallStretchStep[]
}

export type PanelInstallBundleFailure = 'needTwoPlanarGroups' | 'missingSpanElements'

export type PanelInstallBundleResult = PanelInstallBundle | { ok: false; reason: PanelInstallBundleFailure }

export function isPanelInstallBundleFailure(
  result: PanelInstallBundleResult,
): result is { ok: false; reason: PanelInstallBundleFailure } {
  return 'ok' in result && result.ok === false
}

function sortedPatch(patch: readonly number[]): number[] {
  return [...patch].sort((a, b) => a - b)
}

function naiveStretchMmAfterAddingMinMax(currentGapMm: number, minMm: number, maxMm: number): number {
  return Math.min(Math.max(currentGapMm, minMm), maxMm)
}

function stretchStepForMerged(
  geometry: BufferGeometry,
  merged: number[],
  minMm: number,
  maxMm: number,
): { mergedFaces: number[]; targetMm: number } | null {
  const an = analyzeTwoFaceStretch(geometry, merged)
  if (!an.ok) return null
  return {
    mergedFaces: merged,
    targetMm: naiveStretchMmAfterAddingMinMax(an.gapMm, minMm, maxMm),
  }
}

/** PANEL + CONST (grubość) + MINMAX (X, opcjonalnie Y) oraz kroki rozciągania. */
export function buildPanelInstallBundle(params: {
  geometry: BufferGeometry
  panelId: string
  thicknessMm: number
  thicknessTriangles: readonly number[]
  panelXBounds: PanelAxisBounds
  panelYBounds: PanelAxisBounds
  ySameAsX: boolean
  panelXElementAId: string
  panelXElementBId: string
  panelYElementAId: string
  panelYElementBId: string
  preparedModelElements: readonly PreparedModelElement[]
}): PanelInstallBundleResult {
  const {
    geometry,
    panelId,
    thicknessMm,
    thicknessTriangles,
    panelXBounds,
    panelYBounds,
    ySameAsX,
    panelXElementAId,
    panelXElementBId,
    panelYElementAId,
    panelYElementBId,
    preparedModelElements,
  } = params

  const thicknessPatches = partitionSelectionIntoCoplanarPatches(geometry, thicknessTriangles)
  if (thicknessPatches.length !== 2) {
    return { ok: false, reason: 'needTwoPlanarGroups' }
  }

  const mergedX = mergeTrianglesForPreparedElementPair(
    preparedModelElements,
    panelXElementAId,
    panelXElementBId,
  )
  const mergedY = mergeTrianglesForPreparedElementPair(
    preparedModelElements,
    panelYElementAId,
    panelYElementBId,
  )
  if (!mergedX?.length || !mergedY?.length) {
    return { ok: false, reason: 'missingSpanElements' }
  }

  const patchesX = partitionSelectionIntoCoplanarPatches(geometry, mergedX)
  const patchesY = partitionSelectionIntoCoplanarPatches(geometry, mergedY)
  if (patchesX.length !== 2 || patchesY.length !== 2) {
    return { ok: false, reason: 'needTwoPlanarGroups' }
  }

  const stamp = Math.random().toString(36).slice(2, 8)
  const uaT = sortedPatch(thicknessPatches[0]!)
  const ubT = sortedPatch(thicknessPatches[1]!)
  const thicknessAId = `el-${stamp}-panel-t-a`
  const thicknessBId = `el-${stamp}-panel-t-b`
  const thicknessConstId = `${panelId}-thickness-const`
  const panelXMinMaxId = `${panelId}-axis-x-minmax`
  const panelYMinMaxId = `${panelId}-axis-y-minmax`

  const thicknessConst = buildConstConstraint(
    thicknessConstId,
    thicknessMm,
    thicknessAId,
    thicknessBId,
    uaT,
    ubT,
  )

  const uaX = sortedPatch(patchesX[0]!)
  const ubX = sortedPatch(patchesX[1]!)
  const uaY = sortedPatch(patchesY[0]!)
  const ubY = sortedPatch(patchesY[1]!)

  const minmaxX = buildMinMaxConstraint(
    panelXMinMaxId,
    panelXBounds,
    panelXElementAId,
    panelXElementBId,
    uaX,
    ubX,
  )
  const auxiliaryConstraints: FaceConstraint[] = [thicknessConst, minmaxX]
  if (!ySameAsX) {
    auxiliaryConstraints.push(
      buildMinMaxConstraint(
        panelYMinMaxId,
        panelYBounds,
        panelYElementAId,
        panelYElementBId,
        uaY,
        ubY,
      ),
    )
  }

  const thicknessMergedFaces = [...uaT, ...ubT]
  const stretchSteps: PanelInstallStretchStep[] = [
    {
      mergedFaces: thicknessMergedFaces,
      targetMm: thicknessMm,
      panelThicknessMergedFaces: thicknessMergedFaces,
    },
  ]

  const xStep = stretchStepForMerged(
    geometry,
    mergedX,
    panelXBounds.minMm ?? 0,
    panelXBounds.maxMm,
  )
  if (!xStep) return { ok: false, reason: 'needTwoPlanarGroups' }
  stretchSteps.push(xStep)

  if (!ySameAsX) {
    const yStep = stretchStepForMerged(
      geometry,
      mergedY,
      panelYBounds.minMm ?? 0,
      panelYBounds.maxMm,
    )
    if (!yStep) return { ok: false, reason: 'needTwoPlanarGroups' }
    stretchSteps.push(yStep)
  }

  const panel: PanelFaceConstraint = {
    id: panelId,
    type: 'panel',
    facePair: null,
    thicknessMm,
    panelX: panelXBounds,
    panelY: panelYBounds,
    ySameAsX,
    panelMeasureMode: 'facePairs',
    panelXElementAId,
    panelXElementBId,
    panelYElementAId,
    panelYElementBId,
    thicknessConstId,
    thicknessElementAId: thicknessAId,
    thicknessElementBId: thicknessBId,
    panelXMinMaxId,
    ...(ySameAsX ? {} : { panelYMinMaxId }),
  }

  return {
    panel,
    auxiliaryConstraints,
    extraElements: [
      { id: thicknessAId, faceIndices: uaT },
      { id: thicknessBId, faceIndices: ubT },
    ],
    stretchSteps,
  }
}

export function removePanelAndAuxiliaryConstraints(
  list: readonly FaceConstraint[],
  panelId: string,
): FaceConstraint[] {
  const panel = list.find((c) => c.id === panelId)
  if (!panel || panel.type !== 'panel') {
    return list.filter((c) => c.id !== panelId)
  }
  const drop = new Set<string>([panelId])
  if (panel.thicknessConstId) drop.add(panel.thicknessConstId)
  if (panel.panelXMinMaxId) drop.add(panel.panelXMinMaxId)
  if (panel.panelYMinMaxId) drop.add(panel.panelYMinMaxId)
  return list.filter((c) => !drop.has(c.id))
}
