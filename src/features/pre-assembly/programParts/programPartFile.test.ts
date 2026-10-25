import { describe, expect, it } from 'vitest'
import { PREPARED_ELEMENT_FORMAT, PREPARED_ELEMENT_VERSION } from '../../../lib/preparedElementFormat'
import { isProgramPartFileName, readProgramPartFromFile } from './programPartFile'

function makeEcdprtFile(name: string, partName: string): File {
  const body = JSON.stringify({
    format: PREPARED_ELEMENT_FORMAT,
    version: PREPARED_ELEMENT_VERSION,
    name: partName,
    geometry: { format: 'stl-ascii', data: 'solid test\nendsolid test\n' },
    constraints: { mode: 'fixed', faceConstraints: [], modelElements: [] },
  })
  return new File([body], name, { type: 'application/json' })
}

describe('programPartFile', () => {
  it('detects supported model extensions for program parts', () => {
    expect(isProgramPartFileName('panel.ecdprt')).toBe(true)
    expect(isProgramPartFileName('panel.stl')).toBe(true)
    expect(isProgramPartFileName('panel.step')).toBe(true)
    expect(isProgramPartFileName('notes.txt')).toBe(false)
  })

  it('reads valid ecdprt program file', async () => {
    const file = makeEcdprtFile('my-panel.ecdprt', 'My panel')
    const result = await readProgramPartFromFile(file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.part).toEqual({ ref: 'my-panel.ecdprt', name: 'My panel' })
  })

  it('reads stl as program part using file base name', async () => {
    const file = new File(['solid x\nendsolid x\n'], 'bracket.stl', {
      type: 'model/stl',
    })
    const result = await readProgramPartFromFile(file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.part).toEqual({ ref: 'bracket.stl', name: 'bracket' })
  })

  it('rejects unsupported extension', async () => {
    const file = new File(['x'], 'part.txt', { type: 'text/plain' })
    const result = await readProgramPartFromFile(file)
    expect(result.ok).toBe(false)
  })
})
