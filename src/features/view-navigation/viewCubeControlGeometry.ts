import { Vector3 } from 'three'

const VIEW_CUBE_HANDLE_SCALE = 0.38

export function scaleViewCubeHandle(xyz: readonly [number, number, number]): Vector3 {
  return new Vector3(...xyz).multiplyScalar(VIEW_CUBE_HANDLE_SCALE)
}

/** 8 narożników kostki (jak w drei GizmoViewcube). */
export const VIEW_CUBE_CORNER_HANDLES: readonly (readonly [number, number, number])[] = [
  [1, 1, 1],
  [1, 1, -1],
  [1, -1, 1],
  [1, -1, -1],
  [-1, 1, 1],
  [-1, 1, -1],
  [-1, -1, 1],
  [-1, -1, -1],
] as const

/** 12 krawędzi kostki (jak w drei GizmoViewcube). */
export const VIEW_CUBE_EDGE_HANDLES: readonly (readonly [number, number, number])[] = [
  [1, 1, 0],
  [1, 0, 1],
  [1, 0, -1],
  [1, -1, 0],
  [0, 1, 1],
  [0, 1, -1],
  [0, -1, 1],
  [0, -1, -1],
  [-1, 1, 0],
  [-1, 0, 1],
  [-1, 0, -1],
  [-1, -1, 0],
] as const

export const VIEW_CUBE_CORNER_DIMENSIONS: [number, number, number] = [0.25, 0.25, 0.25]

export function viewCubeEdgeBoxDimensions(edge: Vector3): [number, number, number] {
  return edge.toArray().map((axis) => (axis === 0 ? 0.5 : 0.25)) as [number, number, number]
}
