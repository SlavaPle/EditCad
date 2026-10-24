import { describe, expect, it } from 'vitest'
import { isRemovableSizeLimit } from './isRemovableSizeLimit'
import type { DocumentTreeNode } from './model'

function sizeNode(partial: Partial<DocumentTreeNode>): DocumentTreeNode {
  return {
    id: 's',
    kind: 'size',
    label: 'X',
    ...partial,
  }
}

describe('isRemovableSizeLimit', () => {
  it('true dla limitów z constraintId (elementarne i block/panel/profil)', () => {
    expect(isRemovableSizeLimit(sizeNode({ constraintId: 'c', sizeStatus: 'minmax' }))).toBe(true)
    expect(isRemovableSizeLimit(sizeNode({ constraintId: 'c', sizeStatus: 'min' }))).toBe(true)
    expect(isRemovableSizeLimit(sizeNode({ constraintId: 'c', sizeStatus: 'block' }))).toBe(true)
    expect(isRemovableSizeLimit(sizeNode({ constraintId: 'c', sizeStatus: 'profil' }))).toBe(true)
    expect(isRemovableSizeLimit(sizeNode({ constraintId: 'c', sizeStatus: 'free' }))).toBe(false)
    expect(isRemovableSizeLimit(sizeNode({ sizeStatus: 'minmax' }))).toBe(false)
  })
})
