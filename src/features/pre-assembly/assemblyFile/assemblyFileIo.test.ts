import { describe, expect, it } from 'vitest'
import { createEmptyPhantomFile } from '../phantomStore'
import { createAssemblyFileFromProgram, parseAssemblyFile } from './assemblyCodec'
import {
  buildEcdasmFileName,
  readAssemblyFromFile,
  saveAssemblyToHandle,
  stripEcdasmExtension,
} from './assemblyFileIo'

describe('assemblyFileIo', () => {
  it('buildEcdasmFileName appends extension when missing', () => {
    expect(buildEcdasmFileName('cabinet')).toBe('cabinet.ecdasm')
    expect(buildEcdasmFileName('cabinet.ecdasm')).toBe('cabinet.ecdasm')
  })

  it('stripEcdasmExtension removes extension', () => {
    expect(stripEcdasmExtension('cabinet.ecdasm')).toBe('cabinet')
    expect(stripEcdasmExtension(null)).toBe('assembly')
  })

  it('readAssemblyFromFile parses valid assembly', async () => {
    const phantomDoc = createEmptyPhantomFile({ name: 'Frame' })
    const source = createAssemblyFileFromProgram(
      [{ id: 'p1', ref: 'panel.ecdprt', name: 'Panel' }],
      { id: 'asm-1', name: 'Cabinet', phantomDoc },
    )
    const file = new File([JSON.stringify(source)], 'cabinet.ecdasm', {
      type: 'application/json',
    })
    const result = await readAssemblyFromFile(file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fileName).toBe('cabinet.ecdasm')
    expect(result.file.program).toHaveLength(1)
    expect(result.file.phantom?.id).toBe(phantomDoc.phantom.id)
  })

  it('readAssemblyFromFile returns error for invalid JSON', async () => {
    const file = new File(['not json'], 'bad.ecdasm', { type: 'application/json' })
    const result = await readAssemblyFromFile(file)
    expect(result.ok).toBe(false)
  })

  it('saveAssemblyToHandle writes JSON to handle', async () => {
    const source = createAssemblyFileFromProgram(
      [{ id: 'p1', ref: 'panel.ecdprt', name: 'Panel' }],
      { id: 'asm-1', name: 'Cabinet' },
    )
    const chunks: string[] = []
    const handle = {
      name: 'cabinet.ecdasm',
      createWritable: async () => ({
        write: async (data: Blob | string) => {
          chunks.push(typeof data === 'string' ? data : await data.text())
        },
        close: async () => {},
      }),
    }
    const savedName = await saveAssemblyToHandle(source, handle)
    expect(savedName).toBe('cabinet.ecdasm')
    expect(chunks).toHaveLength(1)
    const parsed = parseAssemblyFile(chunks[0]!)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file.program).toEqual(source.program)
  })
})
