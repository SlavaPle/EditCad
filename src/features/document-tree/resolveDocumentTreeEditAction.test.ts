import { describe, expect, it } from 'vitest'
import type { DocumentTreeNode } from './model'
import { resolveDocumentTreeEditAction } from './resolveDocumentTreeEditAction'

describe('resolveDocumentTreeEditAction', () => {
  it('opens appearance edit on appearance node', () => {
    expect(
      resolveDocumentTreeEditAction({
        id: 'a',
        kind: 'appearance',
        label: 'A',
        partId: 'pa',
      }),
    ).toEqual({ kind: 'contextAction', action: 'editAppearance' })
  })

  it('opens size edit on editable size node', () => {
    const node: DocumentTreeNode = {
      id: 's',
      kind: 'size',
      label: 'X',
      axis: 'x',
      editable: true,
      faceIndices: [0, 1],
    }
    expect(resolveDocumentTreeEditAction(node)).toEqual({
      kind: 'contextAction',
      action: 'editSize',
    })
  })

  it('returns none for locked size without faces/constraint', () => {
    const node: DocumentTreeNode = {
      id: 's',
      kind: 'size',
      label: 'X',
      axis: 'x',
      editable: false,
    }
    expect(resolveDocumentTreeEditAction(node)).toEqual({ kind: 'none' })
  })

  it('opens edit for const size with faces (remove limit / view)', () => {
    const node: DocumentTreeNode = {
      id: 's',
      kind: 'size',
      label: 'X',
      axis: 'x',
      editable: false,
      constraintId: 'c1',
      faceIndices: [0, 1],
      sizeStatus: 'const',
    }
    expect(resolveDocumentTreeEditAction(node)).toEqual({
      kind: 'contextAction',
      action: 'editSize',
    })
  })

  it('returns none for part / groups', () => {
    expect(
      resolveDocumentTreeEditAction({ id: 'p', kind: 'part', label: 'P', partId: 'pa' }),
    ).toEqual({ kind: 'none' })
    expect(
      resolveDocumentTreeEditAction({ id: 'sg', kind: 'sizesGroup', label: 'Sizes' }),
    ).toEqual({ kind: 'none' })
  })

  it('returns none for axis locked by custom (edycja tylko sizeCustom)', () => {
    expect(
      resolveDocumentTreeEditAction({
        id: 'z',
        kind: 'size',
        label: 'Z',
        axis: 'z',
        editable: false,
        constraintId: 'custom-1',
        sizeStatus: 'lockedByCustom',
        sizeLockReason: 'customConflict',
        faceIndices: [0, 1],
      }),
    ).toEqual({ kind: 'none' })
  })
})
