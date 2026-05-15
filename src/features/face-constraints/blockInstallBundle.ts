import type { BufferGeometry } from 'three'
import { partitionSelectionIntoCoplanarPatches } from '../model-selection/facePlaneSelection'
import { measurePreparedElementPairGapMm } from '../part-constraints/measurePairGapMm'
import { mergeTrianglesForPreparedElementPair } from '../part-constraints/mergeFacesForPreparedElementPair'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import type { BlockFaceConstraint, FaceConstraint } from './model'
import { buildConstConstraint } from './primitiveConstraintBuilders'

export type BlockAxisPairInput = {
  elementAId: string
  elementBId: string
}

export type BlockInstallBundle = {
  block: BlockFaceConstraint
  auxiliaryConstraints: FaceConstraint[]
  extraElements: never[]
}

export type BlockInstallBundleFailure = 'needTwoPlanarGroups' | 'missingAxisElements' | 'invalidAxisGap'

export type BlockInstallBundleResult = BlockInstallBundle | { ok: false; reason: BlockInstallBundleFailure }

export function isBlockInstallBundleFailure(
  result: BlockInstallBundleResult,
): result is { ok: false; reason: BlockInstallBundleFailure } {
  return 'ok' in result && result.ok === false
}

function sortedPatch(patch: readonly number[]): number[] {
  return [...patch].sort((a, b) => a - b)
}

export function buildBlockInstallBundle(params: {
  geometry: BufferGeometry
  blockId: string
  axis0: BlockAxisPairInput
  axis1: BlockAxisPairInput
  axis2: BlockAxisPairInput
  preparedModelElements: readonly PreparedModelElement[]
}): BlockInstallBundleResult {
  const { geometry, blockId, axis0, axis1, axis2, preparedModelElements } = params
  const axes = [axis0, axis1, axis2] as const
  const constIds = [`${blockId}-axis0-const`, `${blockId}-axis1-const`, `${blockId}-axis2-const`] as const
  const auxiliaryConstraints: FaceConstraint[] = []

  for (let i = 0; i < 3; i++) {
    const axis = axes[i]!
    const constId = constIds[i]!
    const gap = measurePreparedElementPairGapMm(
      geometry,
      axis.elementAId,
      axis.elementBId,
      preparedModelElements,
    )
    if (gap === null) {
      return { ok: false, reason: 'missingAxisElements' }
    }
    if (!(gap > 0)) {
      return { ok: false, reason: 'invalidAxisGap' }
    }
    const merged = mergeTrianglesForPreparedElementPair(
      preparedModelElements,
      axis.elementAId,
      axis.elementBId,
    )
    if (!merged?.length) {
      return { ok: false, reason: 'missingAxisElements' }
    }
    const patches = partitionSelectionIntoCoplanarPatches(geometry, merged)
    if (patches.length !== 2) {
      return { ok: false, reason: 'needTwoPlanarGroups' }
    }
    auxiliaryConstraints.push(
      buildConstConstraint(
        constId,
        gap,
        axis.elementAId,
        axis.elementBId,
        sortedPatch(patches[0]!),
        sortedPatch(patches[1]!),
      ),
    )
  }

  const block: BlockFaceConstraint = {
    id: blockId,
    type: 'block',
    facePair: null,
    axis0ConstId: constIds[0],
    axis1ConstId: constIds[1],
    axis2ConstId: constIds[2],
    axis0ElementAId: axis0.elementAId,
    axis0ElementBId: axis0.elementBId,
    axis1ElementAId: axis1.elementAId,
    axis1ElementBId: axis1.elementBId,
    axis2ElementAId: axis2.elementAId,
    axis2ElementBId: axis2.elementBId,
  }

  return { block, auxiliaryConstraints, extraElements: [] }
}

export function removeBlockAndAuxiliaryConstraints(
  list: readonly FaceConstraint[],
  blockId: string,
): FaceConstraint[] {
  const block = list.find((c) => c.id === blockId)
  if (!block || block.type !== 'block') {
    return list.filter((c) => c.id !== blockId)
  }
  const drop = new Set<string>([blockId])
  if (block.axis0ConstId) drop.add(block.axis0ConstId)
  if (block.axis1ConstId) drop.add(block.axis1ConstId)
  if (block.axis2ConstId) drop.add(block.axis2ConstId)
  return list.filter((c) => !drop.has(c.id))
}
