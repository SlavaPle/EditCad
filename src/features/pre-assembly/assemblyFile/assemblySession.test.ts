import { describe, expect, it } from 'vitest'
import { PRE_ASSEMBLY_FORMAT, PRE_ASSEMBLY_VERSION } from '../model'
import { createEmptyPhantomFile } from '../phantomStore'
import { createAssemblyFileFromProgram } from './assemblyCodec'
import { phantomDocFromAssemblyFile } from './assemblySession'

describe('phantomDocFromAssemblyFile', () => {
  it('returns null when assembly has no phantom', () => {
    const assembly = createAssemblyFileFromProgram([], { id: 'asm-1', name: 'Empty' })
    expect(phantomDocFromAssemblyFile(assembly)).toBeNull()
  })

  it('builds phantom document from embedded phantom', () => {
    const phantomDoc = createEmptyPhantomFile({ id: 'ph-doc', name: 'Frame' })
    const assembly = createAssemblyFileFromProgram([], {
      id: 'asm-1',
      name: 'Cabinet',
      phantomDoc,
    })
    const result = phantomDocFromAssemblyFile(assembly)
    expect(result).not.toBeNull()
    if (!result) return
    expect(result.format).toBe(PRE_ASSEMBLY_FORMAT)
    expect(result.version).toBe(PRE_ASSEMBLY_VERSION)
    expect(result.id).toBe(phantomDoc.phantom.id)
    expect(result.name).toBe('Frame')
    expect(result.phantom).toEqual(assembly.phantom)
  })

  it('falls back to assembly name when phantom name is missing', () => {
    const phantomDoc = createEmptyPhantomFile({ name: 'Frame' })
    const assembly = createAssemblyFileFromProgram([], {
      id: 'asm-1',
      name: 'Cabinet',
      phantomDoc,
    })
    if (!assembly.phantom) throw new Error('expected phantom')
    delete assembly.phantom.name
    const result = phantomDocFromAssemblyFile(assembly)
    expect(result?.name).toBe('Cabinet')
  })
})
