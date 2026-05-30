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
  it('detects ecdprt extension', () => {
    expect(isProgramPartFileName('panel.ecdprt')).toBe(true)
    expect(isProgramPartFileName('panel.stl')).toBe(false)
  })

  it('reads valid program file', async () => {
    const file = makeEcdprtFile('my-panel.ecdprt', 'My panel')
    const result = await readProgramPartFromFile(file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.part).toEqual({ ref: 'my-panel.ecdprt', name: 'My panel' })
  })

  it('rejects non-ecdprt extension', async () => {
    const file = makeEcdprtFile('part.stl', 'Part')
    const result = await readProgramPartFromFile(file)
    expect(result.ok).toBe(false)
  })
})
