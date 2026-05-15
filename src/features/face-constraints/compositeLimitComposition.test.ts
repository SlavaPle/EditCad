import { describe, expect, it } from 'vitest'
import {
  BLOCK_COMPOSITION,
  auxiliaryPrimitiveKinds,
  blockExpandedPrimitiveKinds,
  matchesComposition,
  panelExpandedPrimitiveKinds,
  PANEL_COMPOSITION,
  profilExpandedPrimitiveKinds,
  PROFIL_COMPOSITION,
} from './compositeLimitComposition'
import type { FaceConstraint, ProfilFaceConstraint } from './model'
import { buildPanelInstallBundle } from './panelInstallBundle'
import { buildProfilInstallBundle } from './profilInstallBundle'
import { buildBlockInstallBundle } from './blockInstallBundle'
import { BufferGeometry, Float32BufferAttribute } from 'three'

function makeSimplePanelGeometry(): { geometry: BufferGeometry; thicknessFaces: number[] } {
  const g = new BufferGeometry()
  const vertices = new Float32BufferAttribute(
    new Float32Array([
      -10, -10, 0, 10, -10, 0, 10, 10, 0, -10, -10, 0, 10, 10, 0, -10, 10, 0,
      -10, -10, 7, 10, -10, 7, 10, 10, 7, -10, -10, 7, 10, 10, 7, -10, 10, 7,
    ]),
    3,
  )
  g.setAttribute('position', vertices)
  return { geometry: g, thicknessFaces: [0, 1, 2, 3] }
}

describe('composite limit composition spec', () => {
  it('documents canonical PANEL order: const, minmax, minmax', () => {
    expect([...PANEL_COMPOSITION]).toEqual(['const', 'minmax', 'minmax'])
  })

  it('documents canonical PROFIL order: minmax, const, const', () => {
    expect([...PROFIL_COMPOSITION]).toEqual(['minmax', 'const', 'const'])
  })

  it('documents canonical BLOCK order: const, const, const', () => {
    expect([...BLOCK_COMPOSITION]).toEqual(['const', 'const', 'const'])
  })
})

describe('panel install matches PANEL composition', () => {
  it('ySameAsX: const + one minmax', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const bundle = buildPanelInstallBundle({
      geometry,
      panelId: 'panel-1',
      thicknessMm: 7,
      thicknessTriangles: thicknessFaces,
      panelXBounds: { maxMm: 50 },
      panelYBounds: { maxMm: 50 },
      ySameAsX: true,
      panelXElementAId: 'xa',
      panelXElementBId: 'xb',
      panelYElementAId: 'ya',
      panelYElementBId: 'yb',
      preparedModelElements: [
        { id: 'xa', faceIndices: [0] },
        { id: 'xb', faceIndices: [2] },
        { id: 'ya', faceIndices: [1] },
        { id: 'yb', faceIndices: [3] },
      ],
    })
    if ('ok' in bundle) expect.fail('panel bundle failed')
    const auxKinds = auxiliaryPrimitiveKinds(bundle.auxiliaryConstraints)
    expect(auxKinds).toEqual(['const', 'minmax'])
    const expanded = panelExpandedPrimitiveKinds(bundle.panel, [
      ...bundle.auxiliaryConstraints,
      bundle.panel,
    ])
    expect(expanded).toEqual(auxKinds)
  })

  it('full panel: const + minmax X + minmax Y', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const bundle = buildPanelInstallBundle({
      geometry,
      panelId: 'panel-2',
      thicknessMm: 7,
      thicknessTriangles: thicknessFaces,
      panelXBounds: { maxMm: 100, minMm: 5 },
      panelYBounds: { maxMm: 200 },
      ySameAsX: false,
      panelXElementAId: 'xa',
      panelXElementBId: 'xb',
      panelYElementAId: 'ya',
      panelYElementBId: 'yb',
      preparedModelElements: [
        { id: 'xa', faceIndices: [0] },
        { id: 'xb', faceIndices: [2] },
        { id: 'ya', faceIndices: [1] },
        { id: 'yb', faceIndices: [3] },
      ],
    })
    if ('ok' in bundle) expect.fail('panel bundle failed')
    const all: FaceConstraint[] = [...bundle.auxiliaryConstraints, bundle.panel]
    expect(matchesComposition(panelExpandedPrimitiveKinds(bundle.panel, all), PANEL_COMPOSITION)).toBe(
      true,
    )
  })
})

describe('profil install matches PROFIL composition', () => {
  it('creates minmax + two const auxiliary constraints', () => {
    const { geometry, thicknessFaces } = makeSimplePanelGeometry()
    const bundle = buildProfilInstallBundle({
      geometry,
      profilId: 'profil-1',
      stretchTriangles: thicknessFaces,
      stretchMaxMm: 12,
      stretchMinMm: 4,
      frozen1ElementAId: 'f1a',
      frozen1ElementBId: 'f1b',
      frozen2ElementAId: 'f2a',
      frozen2ElementBId: 'f2b',
      preparedModelElements: [
        { id: 'f1a', faceIndices: [0] },
        { id: 'f1b', faceIndices: [2] },
        { id: 'f2a', faceIndices: [1] },
        { id: 'f2b', faceIndices: [3] },
      ],
    })
    if ('ok' in bundle) expect.fail(`profil bundle failed: ${bundle.reason}`)
    const all: FaceConstraint[] = [...bundle.auxiliaryConstraints, bundle.profil]
    expect(matchesComposition(profilExpandedPrimitiveKinds(bundle.profil, all), PROFIL_COMPOSITION)).toBe(
      true,
    )
  })
})

describe('block install matches BLOCK composition', () => {
  it('creates three const auxiliary constraints', () => {
    const { geometry } = makeSimplePanelGeometry()
    const elements = [
      { id: 'a0', faceIndices: [0] },
      { id: 'b0', faceIndices: [2] },
      { id: 'a1', faceIndices: [1] },
      { id: 'b1', faceIndices: [3] },
      { id: 'a2', faceIndices: [0, 1] },
      { id: 'b2', faceIndices: [2, 3] },
    ]
    const bundle = buildBlockInstallBundle({
      geometry,
      blockId: 'block-1',
      axis0: { elementAId: 'a0', elementBId: 'b0' },
      axis1: { elementAId: 'a1', elementBId: 'b1' },
      axis2: { elementAId: 'a2', elementBId: 'b2' },
      preparedModelElements: elements,
    })
    if ('ok' in bundle) expect.fail(`block bundle failed: ${bundle.reason}`)
    const all: FaceConstraint[] = [...bundle.auxiliaryConstraints, bundle.block]
    expect(matchesComposition(blockExpandedPrimitiveKinds(bundle.block, all), BLOCK_COMPOSITION)).toBe(
      true,
    )
  })
})

describe('legacy profil without expanded ids', () => {
  it('still reports logical PROFIL composition', () => {
    const profil: ProfilFaceConstraint = {
      id: 'p',
      type: 'profil',
      facePair: { a: 0, b: 1 },
      valueMm: 10,
      frozen1: { elementAId: 'a', elementBId: 'b' },
      frozen2: { elementAId: 'c', elementBId: 'd' },
    }
    expect(profilExpandedPrimitiveKinds(profil, [profil])).toEqual([...PROFIL_COMPOSITION])
  })
})
