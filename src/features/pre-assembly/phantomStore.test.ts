import { describe, expect, it } from 'vitest'
import {
  addAttachment,
  addElementSlot,
  createEmptyPhantomFile,
  hasAttachments,
  validateElementAnchorRequired,
} from './phantomStore'

describe('phantomStore', () => {
  it('createEmptyPhantomFile matches empty template shape', () => {
    const file = createEmptyPhantomFile({ name: 'Frame' })
    expect(file.format).toBe('editcad.pre-assembly')
    expect(file.version).toBe(1)
    expect(file.name).toBe('Frame')
    expect(file.phantom.envelope.phantomKind).toBe('panel')
    expect(file.phantom.attachments).toEqual([])
    expect(file.phantom.elements).toEqual([])
    expect(file.phantom.connections).toEqual([])
  })

  it('addAttachment appends anchor to phantom', () => {
    const file = createEmptyPhantomFile()
    const result = addAttachment(file.phantom, {
      id: 'floor',
      role: 'floor',
      source: { kind: 'boxFace', face: 'posY' },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.phantom.attachments).toHaveLength(1)
    expect(result.phantom.attachments[0]?.id).toBe('floor')
    expect(hasAttachments(result.phantom)).toBe(true)
  })

  it('addElementSlot rejects missing anchorId', () => {
    const file = createEmptyPhantomFile()
    const result = addElementSlot(file.phantom, {
      ref: 'parts/panel.ecdprt',
      anchorId: '',
    })
    expect(result).toEqual({ ok: false, error: 'Element slot requires anchorId.' })
  })

  it('addElementSlot rejects unknown anchor', () => {
    const file = createEmptyPhantomFile()
    const result = addElementSlot(file.phantom, {
      ref: 'parts/panel.ecdprt',
      anchorId: 'missing',
    })
    expect(result).toEqual({
      ok: false,
      error: 'Element slot references unknown anchor "missing".',
    })
  })

  it('addElementSlot succeeds when anchor exists', () => {
    const file = createEmptyPhantomFile()
    const withAnchor = addAttachment(file.phantom, {
      id: 'floor',
      role: 'floor',
      source: { kind: 'boxFace', face: 'posY' },
    })
    expect(withAnchor.ok).toBe(true)
    if (!withAnchor.ok) return

    const result = addElementSlot(withAnchor.phantom, {
      id: 'panel',
      ref: 'parts/panel.ecdprt',
      anchorId: 'floor',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.phantom.elements).toHaveLength(1)
    expect(result.phantom.elements[0]).toMatchObject({
      id: 'panel',
      binding: 'rigid',
      anchorId: 'floor',
      ref: 'parts/panel.ecdprt',
    })
  })

  it('validateElementAnchorRequired mirrors addElementSlot guard', () => {
    const file = createEmptyPhantomFile()
    expect(validateElementAnchorRequired(file.phantom, '')).toEqual({
      ok: false,
      error: 'Element slot requires anchorId.',
    })
    expect(validateElementAnchorRequired(file.phantom, 'floor')).toEqual({
      ok: false,
      error: 'Element slot references unknown anchor "floor".',
    })
  })
})
