import { describe, expect, it, vi, beforeEach } from 'vitest'
import { BoxGeometry } from 'three'
import type { ModelAppearance } from '../../viewer-display/modelAppearance'
import { DEFAULT_MODEL_APPEARANCE } from '../../viewer-display/modelAppearance'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import { loadGeometriesFromAssembly } from './loadAssemblyProgramPartGeometries'

vi.mock('../assemblyFile/assemblyPartHandleStore', () => ({
  restorePartFileHandle: vi.fn(),
}))

vi.mock('../assemblyFile/assemblyRelativePath', () => ({
  getFileFromAssemblyRoot: vi.fn(),
}))

vi.mock('./programPartGeometry', () => ({
  loadProgramPartGeometryFromFile: vi.fn(),
}))

import { restorePartFileHandle } from '../assemblyFile/assemblyPartHandleStore'
import { getFileFromAssemblyRoot } from '../assemblyFile/assemblyRelativePath'
import { loadProgramPartGeometryFromFile } from './programPartGeometry'

const mockedRestoreHandle = vi.mocked(restorePartFileHandle)
const mockedGetFileFromRoot = vi.mocked(getFileFromAssemblyRoot)
const mockedLoadPart = vi.mocked(loadProgramPartGeometryFromFile)

function makePart(id: string, ref: string): PreAssemblyProgramPart {
  return {
    id,
    ref,
    name: id,
    transform: { positionMm: [0, 0, 0], rotationDeg: [0, 0, 0] },
  }
}

describe('loadGeometriesFromAssembly', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRestoreHandle.mockResolvedValue(null)
  })

  it('returns empty maps when parts list is empty', async () => {
    const result = await loadGeometriesFromAssembly('asm-1', [], null)
    expect(result).toEqual({
      geometries: {},
      appearances: {},
      loadedCount: 0,
      missingRefs: [],
      errors: [],
    })
  })

  it('loads geometry and appearance from stored file handle', async () => {
    const geometry = new BoxGeometry(1, 2, 3)
    const appearance: ModelAppearance = {
      surface: 'texture',
      color: '#445566',
      texture: { kind: 'default' },
      opacity: 1,
    }
    const file = new File(['{}'], 'panel.ecdprt')
    const handle = { getFile: vi.fn().mockResolvedValue(file) }
    mockedRestoreHandle.mockResolvedValue(handle as unknown as FileSystemFileHandle)
    mockedLoadPart.mockResolvedValue({ ok: true, geometry, appearance })

    const part = makePart('p1', 'parts/panel.ecdprt')
    const result = await loadGeometriesFromAssembly('asm-1', [part], null)

    expect(result.loadedCount).toBe(1)
    expect(result.geometries.p1).toBe(geometry)
    expect(result.appearances.p1).toEqual(appearance)
    expect(result.missingRefs).toEqual([])
    expect(result.errors).toEqual([])
    expect(mockedGetFileFromRoot).not.toHaveBeenCalled()
    geometry.dispose()
  })

  it('falls back to assembly directory when handle is missing', async () => {
    const geometry = new BoxGeometry(2, 2, 2)
    const file = new File(['{}'], 'bracket.ecdprt')
    const directory = {} as FileSystemDirectoryHandle
    mockedGetFileFromRoot.mockResolvedValue(file)
    mockedLoadPart.mockResolvedValue({
      ok: true,
      geometry,
      appearance: DEFAULT_MODEL_APPEARANCE,
    })

    const part = makePart('p2', 'bracket.ecdprt')
    const result = await loadGeometriesFromAssembly('asm-1', [part], directory)

    expect(result.loadedCount).toBe(1)
    expect(result.appearances.p2).toEqual(DEFAULT_MODEL_APPEARANCE)
    expect(mockedGetFileFromRoot).toHaveBeenCalledWith(directory, 'bracket.ecdprt')
    geometry.dispose()
  })

  it('records missing ref when directory and handle are unavailable', async () => {
    const part = makePart('p3', 'missing.ecdprt')
    const result = await loadGeometriesFromAssembly('asm-1', [part], null)

    expect(result.loadedCount).toBe(0)
    expect(result.geometries).toEqual({})
    expect(result.appearances).toEqual({})
    expect(result.missingRefs).toEqual(['missing.ecdprt'])
    expect(result.errors[0]).toContain('No file access')
  })

  it('loads successful parts and reports failures for others', async () => {
    const okGeometry = new BoxGeometry(1, 1, 1)
    const textured: ModelAppearance = {
      surface: 'texture',
      color: '#ffffff',
      texture: { kind: 'image', dataUrl: 'data:image/png;base64,abc' },
      opacity: 0.5,
    }
    mockedLoadPart
      .mockResolvedValueOnce({ ok: true, geometry: okGeometry, appearance: textured })
      .mockResolvedValueOnce({ ok: false, error: 'Corrupt ECDPRT' })

    const directory = {} as FileSystemDirectoryHandle
    mockedGetFileFromRoot.mockResolvedValue(new File(['{}'], 'x.ecdprt'))

    const parts = [makePart('ok', 'ok.ecdprt'), makePart('bad', 'bad.ecdprt')]
    const result = await loadGeometriesFromAssembly('asm-1', parts, directory)

    expect(result.loadedCount).toBe(1)
    expect(result.geometries.ok).toBe(okGeometry)
    expect(result.appearances.ok).toEqual(textured)
    expect(result.appearances.bad).toBeUndefined()
    expect(result.missingRefs).toEqual(['bad.ecdprt'])
    expect(result.errors[0]).toContain('Corrupt ECDPRT')
    okGeometry.dispose()
  })
})
