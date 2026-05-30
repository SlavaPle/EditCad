import { describe, expect, it, vi } from 'vitest'
import { BoxGeometry } from 'three'
import { loadProgramPartGeometryFromFile } from './programPartGeometry'

vi.mock('../../../lib/loadModel', () => ({
  loadModel: vi.fn(),
}))

import { loadModel } from '../../../lib/loadModel'

const mockedLoadModel = vi.mocked(loadModel)

describe('loadProgramPartGeometryFromFile', () => {
  it('returns geometry for ecdprt load result', async () => {
    const geometry = new BoxGeometry(10, 20, 30)
    mockedLoadModel.mockResolvedValueOnce({
      ok: true,
      format: 'ecdprt',
      geometry,
    })
    const file = new File(['{}'], 'panel.ecdprt', { type: 'application/json' })
    const result = await loadProgramPartGeometryFromFile(file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.geometry).toBe(geometry)
    geometry.dispose()
  })

  it('passes through loadModel errors', async () => {
    mockedLoadModel.mockResolvedValueOnce({
      ok: false,
      error: 'Invalid STL geometry inside ECDPRT.',
    })
    const file = new File(['{}'], 'panel.ecdprt', { type: 'application/json' })
    const result = await loadProgramPartGeometryFromFile(file)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('Invalid STL')
  })

  it('rejects non-ecdprt formats', async () => {
    const geometry = new BoxGeometry(1, 1, 1)
    mockedLoadModel.mockResolvedValueOnce({
      ok: true,
      format: 'stl',
      geometry,
    })
    const file = new File([''], 'panel.stl', { type: 'application/octet-stream' })
    const result = await loadProgramPartGeometryFromFile(file)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('ECDPRT')
    geometry.dispose()
  })
})
