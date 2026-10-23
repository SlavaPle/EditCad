import { describe, expect, it } from 'vitest'
import { buildViewerContextMenuItems } from './ViewerContextMenu'

describe('buildViewerContextMenuItems', () => {
  it('includes Add mate enabled when canAddMate', () => {
    const items = buildViewerContextMenuItems({ canAddMate: true })
    expect(items).toEqual([
      { id: 'addMate', labelKey: 'mates.menu.addMate', disabled: false },
    ])
  })

  it('disables Add mate when fewer than two parts', () => {
    const items = buildViewerContextMenuItems({ canAddMate: false })
    expect(items[0]?.disabled).toBe(true)
  })
})
