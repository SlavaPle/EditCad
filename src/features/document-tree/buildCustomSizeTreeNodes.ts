import type { BufferGeometry } from 'three'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import type { FaceConstraint } from '../face-constraints/model'
import { isCustomSizeConstraint, resolveCustomSizeNodeBinding } from './resolveSizeNodeBinding'
import type { DocumentTreeNode } from './model'

function formatSizeMm(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

/**
 * Węzły „własnych” rozmiarów (para płaszczyzn + opcjonalna nazwa) — poza kanonicznymi X/Y/Z.
 */
export function buildCustomSizeTreeNodes(params: {
  prefix: string
  partId?: string
  geometry: BufferGeometry | null
  modelElements: readonly PreparedModelElement[]
  constraints: readonly FaceConstraint[]
}): DocumentTreeNode[] {
  const { prefix, partId, geometry, modelElements, constraints } = params
  const nodes: DocumentTreeNode[] = []

  for (const c of constraints) {
    if (!geometry) continue
    if (!isCustomSizeConstraint(geometry, modelElements, c)) continue
    const binding = resolveCustomSizeNodeBinding({ geometry, modelElements, constraint: c })
    const name = binding.displayName || c.id
    const valueLabel =
      binding.sizeMm != null ? `${formatSizeMm(binding.sizeMm)} mm` : '—'
    nodes.push({
      id: `${prefix}:sizeCustom:${c.id}`,
      kind: 'sizeCustom',
      label: `${name}: ${valueLabel}`,
      partId,
      constraintId: c.id,
      displayName: binding.displayName ?? undefined,
      sizeMm: binding.sizeMm ?? undefined,
      editable: binding.editable,
      sizeStatus: binding.status,
      sizeLockReason: binding.lockReason,
      faceIndices: binding.faceIndices,
      limitMinMm: binding.limitMinMm ?? undefined,
      limitMaxMm: binding.limitMaxMm ?? undefined,
    })
  }

  return nodes
}
