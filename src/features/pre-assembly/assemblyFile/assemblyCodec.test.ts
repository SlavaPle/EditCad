import { describe, expect, it } from 'vitest'
import { createEmptyPhantomFile } from '../phantomStore'
import {
  createAssemblyFileFromProgram,
  parseAssemblyFile,
  serializeAssemblyFile,
} from './assemblyCodec'

describe('assemblyCodec', () => {
  it('round-trips program parts', () => {
    const file = createAssemblyFileFromProgram(
      [{ id: 'p1', ref: 'panel.ecdprt', name: 'Panel' }],
      { id: 'asm-1', name: 'My assembly' },
    )
    const parsed = parseAssemblyFile(serializeAssemblyFile(file))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file.program).toEqual(file.program)
    expect(parsed.file.name).toBe('My assembly')
    expect(parsed.file.phantom).toBeUndefined()
  })

  it('round-trips a single embedded phantom', () => {
    const phantomDoc = createEmptyPhantomFile({ id: 'ph-doc', name: 'Frame' })
    const file = createAssemblyFileFromProgram([], {
      id: 'asm-1',
      name: 'My assembly',
      phantomDoc,
    })
    const parsed = parseAssemblyFile(serializeAssemblyFile(file))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file.phantom?.id).toBe(phantomDoc.phantom.id)
  })

  it('rejects multiple phantoms', () => {
    const phantomDoc = createEmptyPhantomFile()
    const raw = JSON.parse(serializeAssemblyFile(createAssemblyFileFromProgram([], { phantomDoc })))
    raw.phantom = [raw.phantom, raw.phantom]
    const parsed = parseAssemblyFile(JSON.stringify(raw))
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error).toContain('only one phantom')
  })

  it('rejects phantoms array field', () => {
    const raw = {
      format: 'editcad.assembly',
      version: 1,
      id: 'a',
      name: 'A',
      program: [],
      phantoms: [],
    }
    const parsed = parseAssemblyFile(JSON.stringify(raw))
    expect(parsed.ok).toBe(false)
  })

  it('omits phantom from serialized JSON when absent', () => {
    const file = createAssemblyFileFromProgram([], { id: 'asm-1', name: 'Empty' })
    const raw = JSON.parse(serializeAssemblyFile(file)) as Record<string, unknown>
    expect(raw.phantom).toBeUndefined()
  })

  it('round-trips program and phantom together', () => {
    const phantomDoc = createEmptyPhantomFile({ id: 'ph-doc', name: 'Frame' })
    const file = createAssemblyFileFromProgram(
      [
        { id: 'p1', ref: 'left.ecdprt', name: 'Left' },
        { id: 'p2', ref: 'right.ecdprt', name: 'Right' },
      ],
      { id: 'asm-1', name: 'Cabinet', phantomDoc },
    )
    const parsed = parseAssemblyFile(serializeAssemblyFile(file))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file.program).toEqual(file.program)
    expect(parsed.file.phantom?.id).toBe(phantomDoc.phantom.id)
  })

  it('rejects invalid phantom payload', () => {
    const raw = {
      format: 'editcad.assembly',
      version: 1,
      id: 'a',
      name: 'A',
      program: [],
      phantom: { id: '', envelope: null },
    }
    const parsed = parseAssemblyFile(JSON.stringify(raw))
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error).toContain('Invalid phantom')
  })

  it('does not embed phantom when phantomDoc is null', () => {
    const file = createAssemblyFileFromProgram(
      [{ id: 'p1', ref: 'panel.ecdprt', name: 'Panel' }],
      { id: 'asm-1', name: 'Cabinet', phantomDoc: null },
    )
    expect(file.phantom).toBeUndefined()
  })
})
