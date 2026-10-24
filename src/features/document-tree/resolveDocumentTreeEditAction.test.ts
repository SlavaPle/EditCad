import { describe, expect, it } from 'vitest'
import type { DocumentTreeNode } from './model'
import { resolveDocumentTreeEditAction } from './resolveDocumentTreeEditAction'

function node(
  kind: DocumentTreeNode['kind'],
  extras: Partial<DocumentTreeNode> = {},
): DocumentTreeNode {
  return { id: `id:${kind}`, kind, label: kind, ...extras }
}

describe('resolveDocumentTreeEditAction', () => {
  it('opens appearance edit on appearance node', () => {
    expect(resolveDocumentTreeEditAction(node('appearance', { partId: 'pa' }))).toEqual({
      kind: 'contextAction',
      action: 'editAppearance',
    })
  })

  it('opens appearance edit on part node (edit that part)', () => {
    expect(resolveDocumentTreeEditAction(node('part', { partId: 'pa' }))).toEqual({
      kind: 'contextAction',
      action: 'editAppearance',
    })
  })

  it('returns none when node has no dedicated edit mode', () => {
    for (const kind of [
      'mate',
      'element',
      'root',
      'model',
      'size',
      'elementsGroup',
      'matesGroup',
    ] as const) {
      expect(resolveDocumentTreeEditAction(node(kind))).toEqual({ kind: 'none' })
    }
  })
})
