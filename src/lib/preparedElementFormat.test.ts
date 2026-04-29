import { describe, expect, it } from 'vitest'
import {
  PREPARED_ELEMENT_FORMAT,
  PREPARED_ELEMENT_VERSION,
  parsePreparedElementFile,
  serializePreparedElementFile,
  validatePreparedElementFile,
  type PreparedElementFile,
} from './preparedElementFormat'

function createBaseFile(): PreparedElementFile {
  return {
    format: PREPARED_ELEMENT_FORMAT,
    version: PREPARED_ELEMENT_VERSION,
    name: 'Profile A',
    constraints: {
      mode: 'stretch1d',
      limits: [{ axis: 'x', maxMm: 2400 }],
    },
    geometry: {
      format: 'stl-ascii',
      data: 'solid profile\nendsolid profile',
    },
  }
}

describe('preparedElementFormat', () => {
  it('accepts fixed element constraints', () => {
    const result = validatePreparedElementFile({
      ...createBaseFile(),
      constraints: { mode: 'fixed' },
    })
    expect(result.ok).toBe(true)
  })

  it('accepts stretch2d with distinct axes', () => {
    const result = validatePreparedElementFile({
      ...createBaseFile(),
      constraints: {
        mode: 'stretch2d',
        limits: [
          { axis: 'x', maxMm: 2400 },
          { axis: 'y', maxMm: 1200 },
        ],
      },
    })
    expect(result.ok).toBe(true)
  })

  it('rejects stretch2d with duplicated axis', () => {
    const result = validatePreparedElementFile({
      ...createBaseFile(),
      constraints: {
        mode: 'stretch2d',
        limits: [
          { axis: 'x', maxMm: 2400 },
          { axis: 'x', maxMm: 1200 },
        ],
      },
    })
    expect(result.ok).toBe(false)
  })

  it('rejects invalid maxMm', () => {
    const result = validatePreparedElementFile({
      ...createBaseFile(),
      constraints: {
        mode: 'stretch1d',
        limits: [{ axis: 'x', maxMm: 0 }],
      },
    })
    expect(result.ok).toBe(false)
  })

  it('roundtrips through JSON', () => {
    const source = createBaseFile()
    const content = serializePreparedElementFile(source)
    const parsed = parsePreparedElementFile(content)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file).toEqual(source)
  })
})
