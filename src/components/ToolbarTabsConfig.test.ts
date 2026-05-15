import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOLBAR_TAB_ID, TOOLBAR_TABS } from './ToolbarTabsConfig'

describe('TOOLBAR_TABS configuration', () => {
  it('contains at least one tab', () => {
    expect(TOOLBAR_TABS.length).toBeGreaterThan(0)
  })

  it('includes file, edit and view tabs', () => {
    const ids = TOOLBAR_TABS.map((tab) => tab.id)
    expect(ids).toContain('file')
    expect(ids).toContain('edit')
    expect(ids).toContain('view')
  })

  it('edit tab includes appearance action', () => {
    const edit = TOOLBAR_TABS.find((t) => t.id === 'edit')
    expect(edit?.actions).toContain('editAppearance')
  })

  it('places view tab after edit', () => {
    const ids = TOOLBAR_TABS.map((tab) => tab.id)
    expect(ids.indexOf('view')).toBeGreaterThan(ids.indexOf('edit'))
  })

  it('default tab id exists in configuration', () => {
    const ids = TOOLBAR_TABS.map((tab) => tab.id)
    expect(ids).toContain(DEFAULT_TOOLBAR_TAB_ID)
  })
})


