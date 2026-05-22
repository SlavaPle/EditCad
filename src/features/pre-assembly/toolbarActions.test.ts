import { describe, expect, it } from 'vitest'
import { addAttachment, createEmptyPhantomFile } from './phantomStore'
import { getPreAssemblyAddPartTitleKey, getPreAssemblyToolbarUi } from './toolbarActions'

describe('pre-assembly toolbarActions', () => {
  it('disables add part when phantom is missing', () => {
    const ui = getPreAssemblyToolbarUi({ phantomDoc: null })
    expect(ui).toEqual({
      hasPhantom: false,
      addPartDisabled: true,
      addPartDisabledReason: 'noPhantom',
      createAttachmentDisabled: true,
      saveDisabled: true,
      saveDisabledReason: 'noPhantom',
    })
    expect(getPreAssemblyAddPartTitleKey(ui, false)).toBe('preAssembly.addPart.button')
  })

  it('disables add part when phantom has no attachments', () => {
    const ui = getPreAssemblyToolbarUi({ phantomDoc: createEmptyPhantomFile() })
    expect(ui.hasPhantom).toBe(true)
    expect(ui.addPartDisabled).toBe(true)
    expect(ui.addPartDisabledReason).toBe('noAnchors')
    expect(ui.createAttachmentDisabled).toBe(false)
    expect(ui.saveDisabled).toBe(false)
    expect(ui.saveDisabledReason).toBe(null)
    expect(getPreAssemblyAddPartTitleKey(ui, false)).toBe('preAssembly.addPart.noAnchors')
  })

  it('enables add part when at least one attachment exists', () => {
    const file = createEmptyPhantomFile()
    const anchored = addAttachment(file.phantom, {
      id: 'floor',
      role: 'floor',
      source: { kind: 'boxFace', face: 'posY' },
    })
    expect(anchored.ok).toBe(true)
    if (!anchored.ok) return

    const ui = getPreAssemblyToolbarUi({
      phantomDoc: { ...file, phantom: anchored.phantom },
    })
    expect(ui.addPartDisabled).toBe(false)
    expect(ui.addPartDisabledReason).toBe(null)
    expect(getPreAssemblyAddPartTitleKey(ui, true)).toBe('preAssembly.addPart.active')
  })
})
