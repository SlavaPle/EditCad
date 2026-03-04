import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOLBAR_TAB_ID, TOOLBAR_TABS } from './ToolbarTabsConfig'

describe('TOOLBAR_TABS configuration', () => {
  it('contains at least one tab', () => {
    expect(TOOLBAR_TABS.length).toBeGreaterThan(0)
  })

  it('includes file and edit tabs', () => {
    const ids = TOOLBAR_TABS.map((tab) => tab.id)
    expect(ids).toContain('file')
    expect(ids).toContain('edit')
  })

  it('default tab id exists in configuration', () => {
    const ids = TOOLBAR_TABS.map((tab) => tab.id)
    expect(ids).toContain(DEFAULT_TOOLBAR_TAB_ID)
  })
})


