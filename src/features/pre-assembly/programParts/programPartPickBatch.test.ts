import { describe, expect, it, vi, beforeEach } from 'vitest'
import { BoxGeometry } from 'three'
import { pickProgramPartsFromFiles } from './programPartPickBatch'

vi.mock('./programPartFile', () => ({
  readProgramPartFromFileWithRoot: vi.fn(),
}))

vi.mock('./programPartGeometry', () => ({
  loadProgramPartGeometryFromFile: vi.fn(),
}))

import { readProgramPartFromFileWithRoot } from './programPartFile'
import { loadProgramPartGeometryFromFile } from './programPartGeometry'

const mockedReadMeta = vi.mocked(readProgramPartFromFileWithRoot)
const mockedLoadGeometry = vi.mocked(loadProgramPartGeometryFromFile)

describe('pickProgramPartsFromFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty batch for empty file list', async () => {
    const result = await pickProgramPartsFromFiles([], null)
    expect(result).toEqual({ picked: [], errors: [] })
  })

  it('includes appearance in picked entry', async () => {
    const geometry = new BoxGeometry(1, 1, 1)
    const appearance = {
      surface: 'texture' as const,
      color: '#ddeeff',
      texture: { kind: 'default' as const },
      opacity: 1,
    }
    const file = new File(['{}'], 'panel.ecdprt')
    mockedReadMeta.mockResolvedValue({
      ok: true,
      part: { ref: 'panel.ecdprt', name: 'Panel' },
    })
    mockedLoadGeometry.mockResolvedValue({ ok: true, geometry, appearance })

    const result = await pickProgramPartsFromFiles([file], null)

    expect(result.errors).toEqual([])
    expect(result.picked).toHaveLength(1)
    expect(result.picked[0]?.appearance).toEqual(appearance)
    expect(result.picked[0]?.geometry).toBe(geometry)
    geometry.dispose()
  })

  it('collects meta and geometry errors separately', async () => {
    const file = new File(['{}'], 'bad.ecdprt')
    mockedReadMeta.mockResolvedValue({ ok: false, error: 'Invalid JSON' })
    mockedLoadGeometry.mockResolvedValue({ ok: false, error: 'Should not run' })

    const result = await pickProgramPartsFromFiles([file], null)

    expect(result.picked).toEqual([])
    expect(result.errors).toEqual(['bad.ecdprt: Invalid JSON'])
    expect(mockedLoadGeometry).not.toHaveBeenCalled()
  })

  it('picks valid files and reports invalid ones in one batch', async () => {
    const geometry = new BoxGeometry(2, 2, 2)
    const good = new File(['{}'], 'good.ecdprt')
    const bad = new File(['{}'], 'bad.ecdprt')
    mockedReadMeta
      .mockResolvedValueOnce({ ok: true, part: { ref: 'good.ecdprt', name: 'Good' } })
      .mockResolvedValueOnce({ ok: false, error: 'Wrong format' })
    mockedLoadGeometry.mockResolvedValueOnce({
      ok: true,
      geometry,
      appearance: {
        surface: 'color',
        color: '#112233',
        texture: { kind: 'default' },
        opacity: 1,
      },
    })

    const result = await pickProgramPartsFromFiles([good, bad], null)

    expect(result.picked).toHaveLength(1)
    expect(result.picked[0]?.part.ref).toBe('good.ecdprt')
    expect(result.errors).toEqual(['bad.ecdprt: Wrong format'])
    geometry.dispose()
  })
})
