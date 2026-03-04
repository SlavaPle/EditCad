import { describe, it, expect } from 'vitest'
import {
  createEmptySelection,
  selectVertex,
  selectEdge,
  selectFace,
  selectFaces,
  clearSelection,
  isVertexSelected,
  isEdgeSelected,
  isFaceSelected,
  type SelectionState,
} from './selection'

describe('selection module', () => {
  it('creates empty selection', () => {
    const s = createEmptySelection()
    expect(s.vertices).toEqual([])
    expect(s.edges).toEqual([])
    expect(s.faces).toEqual([])
  })

  it('selects single vertex (replace mode)', () => {
    const s0 = createEmptySelection()
    const s1 = selectVertex(s0, 5)
    expect(s1.vertices).toEqual([5])
  })

  it('adds vertices in add mode without duplicates', () => {
    let s: SelectionState = createEmptySelection()
    s = selectVertex(s, 1, 'add')
    s = selectVertex(s, 2, 'add')
    s = selectVertex(s, 2, 'add')
    expect(s.vertices.sort()).toEqual([1, 2])
  })

  it('toggles vertex selection', () => {
    let s: SelectionState = createEmptySelection()
    s = selectVertex(s, 3, 'toggle')
    expect(isVertexSelected(s, 3)).toBe(true)
    s = selectVertex(s, 3, 'toggle')
    expect(isVertexSelected(s, 3)).toBe(false)
  })

  it('treats edges (a, b) and (b, a) as the same edge', () => {
    let s: SelectionState = createEmptySelection()
    s = selectEdge(s, 1, 2, 'add')
    expect(isEdgeSelected(s, 2, 1)).toBe(true)
  })

  it('adds edges in add mode and does not duplicate', () => {
    let s: SelectionState = createEmptySelection()
    s = selectEdge(s, 1, 2, 'add')
    s = selectEdge(s, 2, 3, 'add')
    s = selectEdge(s, 2, 1, 'add')
    expect(s.edges).toHaveLength(2)
    expect(isEdgeSelected(s, 1, 2)).toBe(true)
    expect(isEdgeSelected(s, 2, 3)).toBe(true)
  })

  it('toggles edge selection', () => {
    let s: SelectionState = createEmptySelection()
    s = selectEdge(s, 4, 5, 'toggle')
    expect(isEdgeSelected(s, 5, 4)).toBe(true)
    s = selectEdge(s, 5, 4, 'toggle')
    expect(isEdgeSelected(s, 4, 5)).toBe(false)
  })

  it('selects faces and toggles them', () => {
    let s: SelectionState = createEmptySelection()
    s = selectFace(s, 10, 'add')
    s = selectFace(s, 11, 'add')
    expect(isFaceSelected(s, 10)).toBe(true)
    s = selectFace(s, 10, 'toggle')
    expect(isFaceSelected(s, 10)).toBe(false)
  })

  it('clears whole selection', () => {
    let s: SelectionState = createEmptySelection()
    s = selectVertex(s, 1, 'add')
    s = selectEdge(s, 1, 2, 'add')
    s = selectFace(s, 3, 'add')
    s = clearSelection(s)
    expect(s.vertices).toEqual([])
    expect(s.edges).toEqual([])
    expect(s.faces).toEqual([])
  })

  it('clears selection by kind only', () => {
    let s: SelectionState = createEmptySelection()
    s = selectVertex(s, 1, 'add')
    s = selectEdge(s, 1, 2, 'add')
    s = selectFace(s, 3, 'add')

    s = clearSelection(s, 'vertex')
    expect(s.vertices).toEqual([])
    expect(s.edges).not.toEqual([])
    expect(s.faces).not.toEqual([])

    s = clearSelection(s, 'edge')
    expect(s.edges).toEqual([])
    expect(s.faces).not.toEqual([])

    s = clearSelection(s, 'face')
    expect(s.faces).toEqual([])
  })

  it('selects multiple faces at once with selectFaces', () => {
    let s: SelectionState = createEmptySelection()
    s = selectFaces(s, [1, 2, 3], 'replace')
    expect(s.faces.sort()).toEqual([1, 2, 3])

    s = selectFaces(s, [3, 4], 'add')
    expect(s.faces.sort()).toEqual([1, 2, 3, 4])

    s = selectFaces(s, [2, 4], 'toggle')
    expect(s.faces.sort()).toEqual([1, 3])
  })
})

