import { describe, expect, it } from 'vitest'
import { createEmptyPhantomFile } from './phantomStore'
import {
  buildEcdpreFileName,
  readPhantomAssemblyFromText,
  savePhantomAssemblyToHandle,
  stripEcdpreExtension,
  validatePhantomForSave,
} from './fileIo'
import { serializePhantomAssemblyFile } from './codec'

describe('pre-assembly fileIo', () => {
  it('buildEcdpreFileName appends extension when missing', () => {
    expect(buildEcdpreFileName('frame')).toBe('frame.ecdpre')
    expect(buildEcdpreFileName('frame.ecdpre')).toBe('frame.ecdpre')
  })

  it('stripEcdpreExtension removes extension', () => {
    expect(stripEcdpreExtension('frame.ecdpre')).toBe('frame')
    expect(stripEcdpreExtension(null)).toBe('phantom')
  })

  it('readPhantomAssemblyFromText parses serialized empty phantom', async () => {
    const source = createEmptyPhantomFile({ name: 'Test phantom' })
    const result = await readPhantomAssemblyFromText(serializePhantomAssemblyFile(source))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.file.name).toBe('Test phantom')
  })

  it('validatePhantomForSave accepts empty phantom', () => {
    expect(validatePhantomForSave(createEmptyPhantomFile()).ok).toBe(true)
  })

  it('savePhantomAssemblyToHandle writes JSON to handle', async () => {
    const source = createEmptyPhantomFile({ name: 'Writable' })
    const chunks: string[] = []
    const handle = {
      name: 'writable.ecdpre',
      createWritable: async () => ({
        write: async (data: Blob | string) => {
          chunks.push(typeof data === 'string' ? data : await data.text())
        },
        close: async () => {},
      }),
    }
    const savedName = await savePhantomAssemblyToHandle(source, handle)
    expect(savedName).toBe('writable.ecdpre')
    expect(chunks).toHaveLength(1)
    const parsed = await readPhantomAssemblyFromText(chunks[0]!)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file.name).toBe('Writable')
  })
})
