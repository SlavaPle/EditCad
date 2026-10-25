import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOLBAR_TAB_ID, TOOLBAR_TABS } from './ToolbarTabsConfig'

describe('TOOLBAR_TABS configuration', () => {
  it('contains at least one tab', () => {
    expect(TOOLBAR_TABS.length).toBeGreaterThan(0)
  })

  it('includes file, edit and view tabs only', () => {
    const ids = TOOLBAR_TABS.map((tab) => tab.id)
    expect(ids).toEqual(['file', 'edit', 'view'])
  })

  it('file tab hosts open/save and assembly actions', () => {
    const file = TOOLBAR_TABS.find((t) => t.id === 'file')
    expect(file?.actions).toEqual([
      'open',
      'save',
      'saveAs',
      'paste',
      'addPart',
      'createPhantom',
      'createAttachment',
    ])
  })

  it('edit tab includes appearance and mates actions', () => {
    const edit = TOOLBAR_TABS.find((t) => t.id === 'edit')
    expect(edit?.actions).toContain('editAppearance')
    expect(edit?.actions).toContain('editMates')
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
