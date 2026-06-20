import { describe, expect, it } from 'vitest'
import { BoxGeometry, Mesh, OrthographicCamera, Vector3 } from 'three'
import { captureMatePlane } from './captureMatePlane'
import {
  MATE_PLANE_PICK_FILTER,
  meshBuiltinFacePickOnPointerDown,
  pickMatePlaneAtPointer,
  resolveActiveMatesPickSlot,
  shouldBeginMatePlanePick,
  toggleMatesPickSlot,
} from './pickMatePlaneAtPointer'

function quadInPlaneZ(z: number): Mesh {
  const geometry = new BoxGeometry(10, 10, 0.1)
  geometry.translate(0, 0, z)
  return new Mesh(geometry)
}

function pickInput(options: {
  partId?: string
  mesh: Mesh
  faceIndex: number
  localPoint: Vector3
  pickSlot?: 'planeA' | 'planeB' | null
  pointerButton?: number
}) {
  const mesh = options.mesh
  const worldPoint = mesh.localToWorld(options.localPoint.clone())
  return {
    partId: options.partId ?? 'part-a',
    geometry: mesh.geometry,
    mesh,
    worldPoint,
    faceIndex: options.faceIndex,
    pickSlot: options.pickSlot !== undefined ? options.pickSlot : 'planeA',
    pointerButton: options.pointerButton ?? 0,
    camera: new OrthographicCamera(),
    pointer: { x: 100, y: 100 },
    viewport: { width: 800, height: 600 },
  }
}

describe('resolveActiveMatesPickSlot', () => {
  it('prefers ref over stale null mode slot', () => {
    expect(resolveActiveMatesPickSlot('planeA', null)).toBe('planeA')
  })

  it('falls back to mode slot when ref is empty', () => {
    expect(resolveActiveMatesPickSlot(null, 'planeB')).toBe('planeB')
  })
})

describe('toggleMatesPickSlot', () => {
  it('activates slot when inactive', () => {
    expect(toggleMatesPickSlot(null, 'planeA')).toBe('planeA')
  })

  it('deactivates slot when already active', () => {
    expect(toggleMatesPickSlot('planeA', 'planeA')).toBe(null)
  })

  it('switches between planeA and planeB', () => {
    expect(toggleMatesPickSlot('planeA', 'planeB')).toBe('planeB')
  })
})

describe('shouldBeginMatePlanePick', () => {
  it('requires ref slot and geometry', () => {
    expect(shouldBeginMatePlanePick('planeA', true)).toBe(true)
    expect(shouldBeginMatePlanePick(null, true)).toBe(false)
    expect(shouldBeginMatePlanePick('planeA', false)).toBe(false)
  })
})

describe('meshBuiltinFacePickOnPointerDown', () => {
  it('disables built-in face pick while mates popup pick context is active', () => {
    expect(meshBuiltinFacePickOnPointerDown(true, true)).toBe(false)
    expect(meshBuiltinFacePickOnPointerDown(true, false)).toBe(true)
  })
})

describe('pickMatePlaneAtPointer', () => {
  it('captures coplanar plane patch from LMB on assembly part face', () => {
    const mesh = quadInPlaneZ(0)
    const result = pickMatePlaneAtPointer(
      pickInput({
        mesh,
        faceIndex: 0,
        localPoint: new Vector3(0, 0, 0.05),
        pickSlot: 'planeA',
      }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.slot).toBe('planeA')
    expect(result.plane.partId).toBe('part-a')
    expect(result.plane.faceIndices.length).toBeGreaterThan(0)
  })

  it('returns noSlot when pick mode is inactive', () => {
    const mesh = quadInPlaneZ(0)
    const result = pickMatePlaneAtPointer(
      pickInput({
        mesh,
        faceIndex: 0,
        localPoint: new Vector3(0, 0, 0.05),
        pickSlot: null,
      }),
    )
    expect(result).toEqual({ ok: false, reason: 'noSlot' })
  })

  it('ignores non-LMB clicks', () => {
    const mesh = quadInPlaneZ(0)
    const result = pickMatePlaneAtPointer(
      pickInput({
        mesh,
        faceIndex: 0,
        localPoint: new Vector3(0, 0, 0.05),
        pointerButton: 1,
      }),
    )
    expect(result).toEqual({ ok: false, reason: 'wrongButton' })
  })

  it('returns noFaceIndex when raycast missed the mesh', () => {
    const mesh = quadInPlaneZ(0)
    const result = pickMatePlaneAtPointer(
      pickInput({
        mesh,
        faceIndex: undefined as unknown as number,
        localPoint: new Vector3(0, 0, 0.05),
      }),
    )
    expect(result).toEqual({ ok: false, reason: 'noFaceIndex' })
  })

  it('uses face-plane-only proximity filter', () => {
    expect(MATE_PLANE_PICK_FILTER).toEqual({
      facePlane: true,
      edgeLine: false,
      vertex: false,
    })
  })

  it('matches captureMatePlane for the same seed face', () => {
    const mesh = quadInPlaneZ(2)
    const geometry = mesh.geometry
    const picked = pickMatePlaneAtPointer(
      pickInput({
        partId: 'part-b',
        mesh,
        faceIndex: 1,
        localPoint: new Vector3(2, 2, 2.05),
        pickSlot: 'planeB',
      }),
    )
    expect(picked.ok).toBe(true)
    if (!picked.ok) return

    const direct = captureMatePlane('part-b', geometry, 1)
    expect(direct.ok).toBe(true)
    if (!direct.ok) return
    expect(picked.plane).toEqual(direct.plane)
  })
})

describe('mate plane pick flow (ref + handler)', () => {
  it('routes pointer to mate pick when ref slot is set even if mode slot is stale', () => {
    const refSlot: 'planeA' | null = 'planeA'
    const modeSlot: 'planeA' | null = null

    expect(shouldBeginMatePlanePick(refSlot, true)).toBe(true)
    expect(resolveActiveMatesPickSlot(refSlot, modeSlot)).toBe('planeA')

    const mesh = quadInPlaneZ(0)
    const result = pickMatePlaneAtPointer(
      pickInput({
        mesh,
        faceIndex: 0,
        localPoint: new Vector3(0, 0, 0.05),
        pickSlot: resolveActiveMatesPickSlot(refSlot, modeSlot),
      }),
    )
    expect(result.ok).toBe(true)
  })
})
