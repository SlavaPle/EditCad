import { describe, expect, it, vi } from 'vitest'
import { BoxGeometry, Mesh, OrthographicCamera, Vector3 } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import {
  createEmptySelection,
  selectFaces,
  type SelectionState,
} from '../../lib/selection'
import { applyPickMeshElementResult, pickMeshElementAtPointer } from './pickMeshElement'

const FACE_ONLY_FILTER = { facePlane: true, edgeLine: false, vertex: false } as const
const EDGE_ONLY_FILTER = { facePlane: false, edgeLine: true, vertex: false } as const
const VERTEX_ONLY_FILTER = { facePlane: false, edgeLine: false, vertex: true } as const

function createPickInput(options: {
  geometry: BoxGeometry
  faceIndex: number
  localPoint: Vector3
  shiftHeld?: boolean
  currentSelection?: SelectionState
  currentPrimaryFaces?: readonly number[]
  probableFaces?: readonly number[]
  filter?: typeof FACE_ONLY_FILTER | typeof EDGE_ONLY_FILTER | typeof VERTEX_ONLY_FILTER
}) {
  const mesh = new Mesh(options.geometry)
  const camera = new OrthographicCamera()
  const event = {
    faceIndex: options.faceIndex,
    camera,
    point: new Vector3(),
    nativeEvent: {
      button: 0,
      shiftKey: options.shiftHeld ?? false,
      offsetX: 100,
      offsetY: 100,
      target: null,
    } as PointerEvent,
  } as ThreeEvent<PointerEvent>

  return {
    model: options.geometry,
    mesh,
    event,
    selectionProximityFilter: options.filter ?? FACE_ONLY_FILTER,
    currentSelection: options.currentSelection ?? createEmptySelection(),
    currentPrimaryFaces: options.currentPrimaryFaces ?? [],
    probableFaces: options.probableFaces ?? [],
    shiftHeld: options.shiftHeld ?? false,
    localPoint: options.localPoint,
  }
}

describe('pickMeshElementAtPointer', () => {
  it('plain face click selects only the picked patch without probable opposite', () => {
    const geometry = new BoxGeometry(2, 2, 6)
    const result = pickMeshElementAtPointer(
      createPickInput({
        geometry,
        faceIndex: 8,
        localPoint: new Vector3(0, 0, 0),
        filter: FACE_ONLY_FILTER,
      }),
    )

    expect(result.kind).toBe('picked')
    if (result.kind !== 'picked') return
    expect(result.selection.faces.length).toBeGreaterThan(0)
    expect(result.selection.faces).toContain(8)
    expect(result.probableFaces).toEqual([])
    expect(result.primaryFaces.length).toBeGreaterThan(0)
  })

  it('shift face click keeps probable opposite faces for stretch proximity', () => {
    const geometry = new BoxGeometry(2, 2, 6)
    const result = pickMeshElementAtPointer(
      createPickInput({
        geometry,
        faceIndex: 8,
        localPoint: new Vector3(0, 0, 0),
        shiftHeld: true,
        filter: FACE_ONLY_FILTER,
      }),
    )

    expect(result.kind).toBe('picked')
    if (result.kind !== 'picked') return
    expect(result.selection.faces.length).toBeGreaterThan(0)
    expect(result.probableFaces.length).toBeGreaterThanOrEqual(2)
    for (const fi of result.probableFaces) {
      expect(result.selection.faces).not.toContain(fi)
    }
  })

  it('plain face click on the same patch clears selection', () => {
    const geometry = new BoxGeometry(2, 2, 6)
    const first = pickMeshElementAtPointer(
      createPickInput({
        geometry,
        faceIndex: 8,
        localPoint: new Vector3(0, 0, 0),
        filter: FACE_ONLY_FILTER,
      }),
    )
    expect(first.kind).toBe('picked')
    if (first.kind !== 'picked') return

    const second = pickMeshElementAtPointer(
      createPickInput({
        geometry,
        faceIndex: 8,
        localPoint: new Vector3(0, 0, 0),
        currentSelection: first.selection,
        currentPrimaryFaces: first.primaryFaces,
        probableFaces: first.probableFaces,
        filter: FACE_ONLY_FILTER,
      }),
    )

    expect(second.kind).toBe('cleared')
  })

  it('plain edge click selects edge without parallel extreme faces', () => {
    const geometry = new BoxGeometry(2, 2, 2)
    const result = pickMeshElementAtPointer(
      createPickInput({
        geometry,
        faceIndex: 0,
        localPoint: new Vector3(1, 1, 0),
        filter: EDGE_ONLY_FILTER,
      }),
    )

    expect(result.kind).toBe('picked')
    if (result.kind !== 'picked') return
    expect(result.selection.edges).toHaveLength(1)
    expect(result.probableFaces).toEqual([])
  })

  it('shift edge click adds parallel extreme faces as probable', () => {
    const geometry = new BoxGeometry(2, 2, 2)
    const result = pickMeshElementAtPointer(
      createPickInput({
        geometry,
        faceIndex: 0,
        localPoint: new Vector3(1, 1, 0),
        shiftHeld: true,
        filter: EDGE_ONLY_FILTER,
      }),
    )

    expect(result.kind).toBe('picked')
    if (result.kind !== 'picked') return
    expect(result.selection.edges).toHaveLength(1)
    expect(result.probableFaces.length).toBeGreaterThan(0)
  })

  it('plain vertex click selects a single vertex', () => {
    const geometry = new BoxGeometry(2, 2, 2)
    const result = pickMeshElementAtPointer(
      createPickInput({
        geometry,
        faceIndex: 0,
        localPoint: new Vector3(1, 1, 1),
        filter: VERTEX_ONLY_FILTER,
      }),
    )

    expect(result.kind).toBe('picked')
    if (result.kind !== 'picked') return
    expect(result.selection.vertices).toHaveLength(1)
    expect(result.selection.edges).toHaveLength(0)
    expect(result.selection.faces).toHaveLength(0)
    expect(result.probableFaces).toEqual([])
  })

  it('returns none when faceIndex is missing', () => {
    const geometry = new BoxGeometry(2, 2, 2)
    const input = createPickInput({
      geometry,
      faceIndex: 0,
      localPoint: new Vector3(0, 0, 0),
    })
    const result = pickMeshElementAtPointer({
      ...input,
      event: { ...input.event, faceIndex: undefined } as ThreeEvent<PointerEvent>,
    })
    expect(result.kind).toBe('none')
  })
})

describe('applyPickMeshElementResult', () => {
  it('clears selection and probable faces on cleared result', () => {
    const onSelectionChange = vi.fn()
    const onProbableFacesChange = vi.fn()
    const setPrimaryFaces = vi.fn()

    applyPickMeshElementResult(
      { kind: 'cleared' },
      { onSelectionChange, onProbableFacesChange, setPrimaryFaces },
    )

    expect(onSelectionChange).toHaveBeenCalledWith(createEmptySelection())
    expect(onProbableFacesChange).toHaveBeenCalledWith([])
    expect(setPrimaryFaces).toHaveBeenCalledWith([])
  })

  it('applies picked selection, probable faces and primary faces', () => {
    const selection = selectFaces(createEmptySelection(), [4, 5], 'replace')
    const onSelectionChange = vi.fn()
    const onProbableFacesChange = vi.fn()
    const setPrimaryFaces = vi.fn()

    applyPickMeshElementResult(
      {
        kind: 'picked',
        selection,
        probableFaces: [10, 11],
        primaryFaces: [4, 5],
      },
      { onSelectionChange, onProbableFacesChange, setPrimaryFaces },
    )

    expect(setPrimaryFaces).toHaveBeenCalledWith([4, 5])
    expect(onProbableFacesChange).toHaveBeenCalledWith([10, 11])
    expect(onSelectionChange).toHaveBeenCalledWith(selection)
  })

  it('ignores none result', () => {
    const onSelectionChange = vi.fn()
    const onProbableFacesChange = vi.fn()
    const setPrimaryFaces = vi.fn()

    applyPickMeshElementResult(
      { kind: 'none' },
      { onSelectionChange, onProbableFacesChange, setPrimaryFaces },
    )

    expect(onSelectionChange).not.toHaveBeenCalled()
    expect(onProbableFacesChange).not.toHaveBeenCalled()
    expect(setPrimaryFaces).not.toHaveBeenCalled()
  })
})
