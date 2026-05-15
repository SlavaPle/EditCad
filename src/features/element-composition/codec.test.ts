import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  ELEMENT_COMPOSITION_FORMAT,
  ELEMENT_COMPOSITION_VERSION,
  parseElementCompositionFile,
  serializeElementCompositionFile,
  validateElementCompositionFile,
  type ElementCompositionFile,
} from './index'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function createEmptyRoot(): ElementCompositionFile {
  return {
    format: ELEMENT_COMPOSITION_FORMAT,
    version: ELEMENT_COMPOSITION_VERSION,
    id: 'assembly-root',
    name: 'Assembly',
  }
}

/**
 * Szkielet pod przyszłe reguły (profil A1/A2, B×3, C co 1000 mm).
 * Pola mass / formulas celowo pominięte — uzupełniane w kolejnej fazie.
 */
function createExtensibleSkeleton(): ElementCompositionFile {
  return {
    format: ELEMENT_COMPOSITION_FORMAT,
    version: ELEMENT_COMPOSITION_VERSION,
    id: 'frame-assembly',
    name: 'Frame assembly',
    totalMass: { kind: 'sumChildren' },
    variants: [
      {
        id: 'profile-a1',
        name: 'Profile A1',
        selector: { kind: 'lengthMm', maxMm: 5000 },
        children: [
          {
            id: 'element-b',
            placement: { kind: 'countPerParent', count: 3 },
          },
          {
            id: 'element-c',
            placement: { kind: 'spacingAlongParent', spacingMm: 1000, axis: 'x' },
          },
        ],
      },
      {
        id: 'profile-a2',
        name: 'Profile A2',
        selector: { kind: 'lengthMm', minMm: 5001, maxMm: 7000 },
      },
    ],
  }
}

describe('element-composition codec', () => {
  it('accepts minimal empty root', () => {
    const result = validateElementCompositionFile(createEmptyRoot())
    expect(result.ok).toBe(true)
  })

  it('roundtrips minimal file through JSON', () => {
    const source = createEmptyRoot()
    const parsed = parseElementCompositionFile(serializeElementCompositionFile(source))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file).toEqual(source)
  })

  it('accepts extensible skeleton with variants, children, mass kinds', () => {
    const source = createExtensibleSkeleton()
    source.variants![0].children![0].mass = { kind: 'fixed', kg: 1.2 }
    source.variants![0].children![1].mass = { kind: 'density', kgPerM3: 7850 }
    source.variants![0].mass = { kind: 'linear', kgPerM: 12.5, lengthRef: 'profileLengthMm' }
    source.variants![1].mass = { kind: 'linear', kgPerM: 15 }
    const content = serializeElementCompositionFile(source)
    const parsed = parseElementCompositionFile(content)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file).toEqual(source)
  })

  it('rejects invalid length range (min > max)', () => {
    const result = validateElementCompositionFile({
      ...createEmptyRoot(),
      selector: { kind: 'lengthMm', minMm: 100, maxMm: 50 },
    })
    expect(result.ok).toBe(false)
  })

  it('rejects duplicate child ids at the same level', () => {
    const result = validateElementCompositionFile({
      ...createEmptyRoot(),
      children: [
        { id: 'dup', mass: { kind: 'fixed', kg: 1 } },
        { id: 'dup', mass: { kind: 'fixed', kg: 2 } },
      ],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects zero fixed mass', () => {
    const result = validateElementCompositionFile({
      ...createEmptyRoot(),
      mass: { kind: 'fixed', kg: 0 },
    })
    expect(result.ok).toBe(false)
  })

  it('rejects unsupported version', () => {
    const result = validateElementCompositionFile({
      ...createEmptyRoot(),
      version: 99,
    })
    expect(result.ok).toBe(false)
  })

  it('accepts committed project templates from config/templates', () => {
    for (const name of ['element-composition.empty.json', 'element-composition.skeleton.json']) {
      const content = readFileSync(join(projectRoot, 'config/templates', name), 'utf8')
      const parsed = parseElementCompositionFile(content)
      expect(parsed.ok, name).toBe(true)
    }
  })
})
