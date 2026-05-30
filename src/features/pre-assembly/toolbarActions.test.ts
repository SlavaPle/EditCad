import { describe, expect, it } from 'vitest'
import { createEmptyPhantomFile } from './phantomStore'
import { getPreAssemblySaveTitleKey, getPreAssemblyToolbarUi } from './toolbarActions'

describe('pre-assembly toolbarActions', () => {
  it('allows program parts without phantom', () => {
    const ui = getPreAssemblyToolbarUi({ phantomDoc: null, programPartCount: 2 })
    expect(ui.hasPhantom).toBe(false)
    expect(ui.hasProgramParts).toBe(true)
    expect(ui.createAttachmentDisabled).toBe(true)
  })

  it('reports no program parts when list is empty', () => {
    const ui = getPreAssemblyToolbarUi({ phantomDoc: null, programPartCount: 0 })
    expect(ui.hasProgramParts).toBe(false)
    expect(ui.canSaveAssembly).toBe(false)
  })

  it('allows saving assembly with program parts only', () => {
    const ui = getPreAssemblyToolbarUi({ phantomDoc: null, programPartCount: 2 })
    expect(ui.canSaveAssembly).toBe(true)
  })

  it('phantom save disabled when bindings incomplete', () => {
    const ui = getPreAssemblyToolbarUi({
      phantomDoc: createEmptyPhantomFile(),
      programPartCount: 0,
    })
    expect(ui.hasPhantom).toBe(true)
    expect(ui.saveDisabled).toBe(false)
    expect(ui.saveDisabledReason).toBe(null)
    expect(getPreAssemblySaveTitleKey(ui)).toBe('preAssembly.savePhantom.button')
  })

  it('allows saving assembly with phantom only', () => {
    const ui = getPreAssemblyToolbarUi({
      phantomDoc: createEmptyPhantomFile(),
      programPartCount: 0,
    })
    expect(ui.canSaveAssembly).toBe(true)
  })
})
