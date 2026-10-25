import { describe, expect, it } from 'vitest'
import { classifyOpenDocumentFileName } from './classifyOpenDocumentFile'

describe('classifyOpenDocumentFileName', () => {
  it('classifies assembly by .ecdasm', () => {
    expect(classifyOpenDocumentFileName('cabinet.ecdasm')).toBe('assembly')
    expect(classifyOpenDocumentFileName('CABINET.ECDASM')).toBe('assembly')
  })

  it('classifies prepared part and mesh as model', () => {
    expect(classifyOpenDocumentFileName('panel.ecdprt')).toBe('model')
    expect(classifyOpenDocumentFileName('box.stl')).toBe('model')
    expect(classifyOpenDocumentFileName('legacy.step')).toBe('model')
  })

  it('returns null for unsupported names', () => {
    expect(classifyOpenDocumentFileName('notes.txt')).toBe(null)
    expect(classifyOpenDocumentFileName('')).toBe(null)
  })
})
