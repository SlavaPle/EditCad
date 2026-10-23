import { describe, expect, it } from 'vitest'
import type { AssemblyMate } from '../assembly-mates/model'
import { resolveDocumentTreeSelectEffect } from './documentTreeSelectActions'
import type { DocumentTreeNode } from './model'

const mate: AssemblyMate = {
  id: 'm1',
  kind: 'parallel',
  entityA: { partId: 'pa', faceIndex: 0, faceIndices: [0, 1] },
  entityB: { partId: 'pb', faceIndex: 2, faceIndices: [2] },
  alignment: 'faceToFace',
  offsetMm: 0,
}

describe('resolveDocumentTreeSelectEffect', () => {
  it('activates part on part node click (viewport highlight)', () => {
    const node: DocumentTreeNode = {
      id: 'part:pa',
      kind: 'part',
      label: 'Bracket',
      partId: 'pa',
    }
    expect(resolveDocumentTreeSelectEffect(node)).toEqual({
      kind: 'activatePart',
      partId: 'pa',
    })
  })

  it('highlights mate entities on mate node click', () => {
    const node: DocumentTreeNode = {
      id: 'mate:m1',
      kind: 'mate',
      label: 'Parallel 1',
      mateId: 'm1',
    }
    const effect = resolveDocumentTreeSelectEffect(node, {
      matesById: { m1: mate },
    })
    expect(effect).toEqual({
      kind: 'highlightMate',
      highlights: { entityA: mate.entityA, entityB: mate.entityB },
    })
  })

  it('activates part and returns faces on element node click', () => {
    const node: DocumentTreeNode = {
      id: 'part:pa:element:fg1',
      kind: 'element',
      label: 'fg1',
      partId: 'pa',
      elementId: 'fg1',
    }
    expect(
      resolveDocumentTreeSelectEffect(node, {
        modelElementsByPartId: {
          pa: [{ id: 'fg1', faceIndices: [3, 4, 5] }],
        },
      }),
    ).toEqual({
      kind: 'highlightElement',
      partId: 'pa',
      faceIndices: [3, 4, 5],
    })
  })

  it('returns none for root / model / appearance / missing mate', () => {
    expect(
      resolveDocumentTreeSelectEffect({ id: 'root:assembly', kind: 'root', label: 'Asm' }),
    ).toEqual({ kind: 'none' })
    expect(
      resolveDocumentTreeSelectEffect({
        id: 'part:pa:model',
        kind: 'model',
        label: 'Model',
        partId: 'pa',
      }),
    ).toEqual({ kind: 'none' })
    expect(
      resolveDocumentTreeSelectEffect(
        { id: 'mate:missing', kind: 'mate', label: 'x', mateId: 'missing' },
        { matesById: {} },
      ),
    ).toEqual({ kind: 'none' })
  })
})
