import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import type { AssemblyMate } from '../assembly-mates/model'
import { highlightsFromAssemblyMate } from './mateHighlightsFromTree'
import type { MateEntityHighlights } from '../assembly-mates/matePlaneFaceOverlay'
import type { DocumentTreeNode } from './model'

export type DocumentTreeSelectEffect =
  | { kind: 'activatePart'; partId: string }
  | { kind: 'highlightMate'; highlights: MateEntityHighlights }
  | {
      kind: 'highlightElement'
      partId: string
      faceIndices: number[]
    }
  | { kind: 'none' }

/**
 * Skutek LKM na węźle drzewa: aktywacja detalu (podświetlenie w viewport),
 * mates lub elementy modelu.
 */
export function resolveDocumentTreeSelectEffect(
  node: DocumentTreeNode,
  options: {
    matesById?: ReadonlyMap<string, AssemblyMate> | Readonly<Record<string, AssemblyMate | undefined>>
    modelElementsByPartId?: Readonly<
      Record<string, readonly PreparedModelElement[] | undefined>
    >
  } = {},
): DocumentTreeSelectEffect {
  if (node.kind === 'part' && node.partId) {
    return { kind: 'activatePart', partId: node.partId }
  }

  if (node.kind === 'mate' && node.mateId) {
    const mate = lookupMate(options.matesById, node.mateId)
    const highlights = highlightsFromAssemblyMate(mate)
    if (!highlights) return { kind: 'none' }
    return { kind: 'highlightMate', highlights }
  }

  if (node.kind === 'element' && node.partId && node.elementId) {
    const elements = options.modelElementsByPartId?.[node.partId] ?? []
    const el = elements.find((e) => e.id === node.elementId)
    if (!el) return { kind: 'none' }
    return {
      kind: 'highlightElement',
      partId: node.partId,
      faceIndices: [...el.faceIndices],
    }
  }

  return { kind: 'none' }
}

function lookupMate(
  matesById:
    | ReadonlyMap<string, AssemblyMate>
    | Readonly<Record<string, AssemblyMate | undefined>>
    | undefined,
  mateId: string,
): AssemblyMate | undefined {
  if (!matesById) return undefined
  if (matesById instanceof Map) return matesById.get(mateId)
  return matesById[mateId]
}
