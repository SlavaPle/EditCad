import { describe, expect, it } from 'vitest'
import { buildContextMenuItems } from './DocumentTreeContextMenu'
import { documentTreeContextActionHasIcon } from './DocumentTreeContextMenuIcons'
import type { DocumentTreeContextActionId, DocumentTreeNode } from './model'

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

  it('every menu action has an icon', () => {
    const samples: DocumentTreeNode[] = [
      { id: 'root', kind: 'root', label: 'Asm' },
      { id: 'part:pa', kind: 'part', label: 'P', partId: 'pa' },
      { id: 'part:pa', kind: 'part', label: 'P', partId: 'pa', locked: true },
      { id: 'a', kind: 'appearance', label: 'A', partId: 'pa' },
      { id: 's', kind: 'size', label: 'X', axis: 'x', sizeMm: 1 },
      { id: 'e', kind: 'element', label: 'el', partId: 'pa', elementId: 'el' },
      { id: 'm', kind: 'mate', label: 'M', mateId: 'm1', partId: 'pa' },
      { id: 'm2', kind: 'mate', label: 'M', mateId: 'm1', partId: 'pa', suppressed: true },
    ]
    const actionIds = new Set<DocumentTreeContextActionId>()
    for (const node of samples) {
      for (const item of buildContextMenuItems(node)) {
        actionIds.add(item.id)
      }
    }
    expect(actionIds.size).toBeGreaterThan(0)
    for (const id of actionIds) {
      expect(documentTreeContextActionHasIcon(id)).toBe(true)
    }
  })
})
