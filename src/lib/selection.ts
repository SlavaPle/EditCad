import type { BufferGeometry } from 'three'

// Stan zaznaczenia elementów modelu (wierzchołki/krawędzie/ściany)

export type SelectionKind = 'vertex' | 'edge' | 'face'

export type SelectionMode = 'replace' | 'add' | 'toggle'

export interface EdgeSelection {
  a: number
  b: number
}

export interface SelectionState {
  vertices: number[]
  edges: EdgeSelection[]
  faces: number[]
}

// Reprezentuje brak zaznaczenia
export function createEmptySelection(): SelectionState {
  return {
    vertices: [],
    edges: [],
    faces: [],
  }
}

// Normalizuje krawędź tak, aby (a, b) i (b, a) były tym samym kluczem
function normalizeEdge(a: number, b: number): EdgeSelection {
  return a <= b ? { a, b } : { a: b, b: a }
}

function edgesEqual(e1: EdgeSelection, e2: EdgeSelection): boolean {
  return e1.a === e2.a && e1.b === e2.b
}

// Wewnętrzna funkcja do aktualizacji zaznaczenia wierzchołka
function updateVertexSelection(
  state: SelectionState,
  index: number,
  mode: SelectionMode,
): SelectionState {
  const exists = state.vertices.includes(index)

  if (mode === 'replace') {
    return { ...state, vertices: [index] }
  }

  if (mode === 'add') {
    if (exists) return state
    return { ...state, vertices: [...state.vertices, index] }
  }

  // toggle
  if (!exists) {
    return { ...state, vertices: [...state.vertices, index] }
  }

  return { ...state, vertices: state.vertices.filter((v) => v !== index) }
}

// Wewnętrzna funkcja do aktualizacji zaznaczenia krawędzi
function updateEdgeSelection(
  state: SelectionState,
  a: number,
  b: number,
  mode: SelectionMode,
): SelectionState {
  const edge = normalizeEdge(a, b)
  const exists = state.edges.some((e) => edgesEqual(e, edge))

  if (mode === 'replace') {
    return { ...state, edges: [edge] }
  }

  if (mode === 'add') {
    if (exists) return state
    return { ...state, edges: [...state.edges, edge] }
  }

  // toggle
  if (!exists) {
    return { ...state, edges: [...state.edges, edge] }
  }

  return { ...state, edges: state.edges.filter((e) => !edgesEqual(e, edge)) }
}

// Wewnętrzna funkcja do aktualizacji zaznaczenia ściany
function updateFaceSelection(
  state: SelectionState,
  index: number,
  mode: SelectionMode,
): SelectionState {
  const exists = state.faces.includes(index)

  if (mode === 'replace') {
    return { ...state, faces: [index] }
  }

  if (mode === 'add') {
    if (exists) return state
    return { ...state, faces: [...state.faces, index] }
  }

  // toggle
  if (!exists) {
    return { ...state, faces: [...state.faces, index] }
  }

  return { ...state, faces: state.faces.filter((f) => f !== index) }
}

// Publiczne API: zaznaczanie wierzchołka
export function selectVertex(
  state: SelectionState,
  index: number,
  mode: SelectionMode = 'replace',
): SelectionState {
  return updateVertexSelection(state, index, mode)
}

// Publiczne API: zaznaczanie krawędzi
export function selectEdge(
  state: SelectionState,
  a: number,
  b: number,
  mode: SelectionMode = 'replace',
): SelectionState {
  return updateEdgeSelection(state, a, b, mode)
}

// Publiczne API: zaznaczanie ściany
export function selectFace(
  state: SelectionState,
  index: number,
  mode: SelectionMode = 'replace',
): SelectionState {
  return updateFaceSelection(state, index, mode)
}

// Publiczne API: zaznaczanie wielu ścian naraz
export function selectFaces(
  state: SelectionState,
  indices: readonly number[],
  mode: SelectionMode = 'replace',
): SelectionState {
  if (indices.length === 0) return state

  if (mode === 'replace') {
    const unique = Array.from(new Set(indices))
    return { ...state, faces: unique }
  }

  if (mode === 'add') {
    const set = new Set(state.faces)
    for (const i of indices) {
      set.add(i)
    }
    return { ...state, faces: Array.from(set) }
  }

  const set = new Set(state.faces)
  for (const i of indices) {
    if (set.has(i)) {
      set.delete(i)
    } else {
      set.add(i)
    }
  }

  return { ...state, faces: Array.from(set) }
}

// Usuwanie zaznaczenia całości lub wybranego typu elementów
export function clearSelection(state: SelectionState, kind?: SelectionKind): SelectionState {
  if (!kind) {
    return createEmptySelection()
  }

  if (kind === 'vertex') {
    return { ...state, vertices: [] }
  }

  if (kind === 'edge') {
    return { ...state, edges: [] }
  }

  return { ...state, faces: [] }
}

// Sprawdzenie, czy wierzchołek jest zaznaczony
export function isVertexSelected(state: SelectionState, index: number): boolean {
  return state.vertices.includes(index)
}

// Sprawdzenie, czy krawędź jest zaznaczona
export function isEdgeSelected(state: SelectionState, a: number, b: number): boolean {
  const edge = normalizeEdge(a, b)
  return state.edges.some((e) => edgesEqual(e, edge))
}

// Sprawdzenie, czy ściana jest zaznaczona
export function isFaceSelected(state: SelectionState, index: number): boolean {
  return state.faces.includes(index)
}

// Przykładowy hook integrujący wybór z geometrią (do dalszej rozbudowy)
export interface GeometrySelectionContext {
  geometry: BufferGeometry
  selection: SelectionState
}

