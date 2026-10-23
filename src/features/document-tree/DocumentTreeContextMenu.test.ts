import { describe, expect, it } from 'vitest'
import { buildContextMenuItems } from './DocumentTreeContextMenu'
import type { DocumentTreeNode } from './model'

describe('buildContextMenuItems for mates', () => {
  it('offers suppress and delete for active mate', () => {
    const node: DocumentTreeNode = {
      id: 'part:pa:mate:m1',
      kind: 'mate',
      label: 'Parallel 1',
      mateId: 'm1',
      partId: 'pa',
    }
    const ids = buildContextMenuItems(node).map((item) => item.id)
    expect(ids).toContain('suppressMate')
    expect(ids).toContain('deleteMate')
    expect(ids).not.toContain('unsuppressMate')
  })

  it('offers unsuppress for suppressed mate', () => {
    const node: DocumentTreeNode = {
      id: 'part:pa:mate:m1',
      kind: 'mate',
      label: 'Parallel 1',
      mateId: 'm1',
      partId: 'pa',
      suppressed: true,
    }
    const ids = buildContextMenuItems(node).map((item) => item.id)
    expect(ids).toContain('unsuppressMate')
    expect(ids).not.toContain('suppressMate')
    expect(ids).toContain('deleteMate')
  })
})
