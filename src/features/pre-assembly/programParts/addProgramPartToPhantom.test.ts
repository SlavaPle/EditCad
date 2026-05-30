import { describe, expect, it } from 'vitest'
import { addAttachment, createEmptyPhantomFile } from '../phantomStore'
import { addProgramPartToPhantom } from './addProgramPartToPhantom'

describe('addProgramPartToPhantom', () => {
  it('returns noAnchors when phantom has no attachments', () => {
    const file = createEmptyPhantomFile()
    const result = addProgramPartToPhantom(file, {
      ref: 'panel.ecdprt',
      name: 'Panel',
    })
    expect(result).toEqual({ ok: false, reason: 'noAnchors' })
  })

  it('adds program part to phantom program tree', () => {
    const file = createEmptyPhantomFile()
    const anchored = addAttachment(file.phantom, {
      id: 'floor',
      role: 'floor',
      source: { kind: 'boxFace', face: 'posY' },
    })
    expect(anchored.ok).toBe(true)
    if (!anchored.ok) return

    const result = addProgramPartToPhantom(
      { ...file, phantom: anchored.phantom },
      { ref: 'branded/panel.ecdprt', name: 'Panel P18' },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.file.phantom.elements[0]).toMatchObject({
      ref: 'branded/panel.ecdprt',
      name: 'Panel P18',
      anchorId: 'floor',
    })
  })
})
