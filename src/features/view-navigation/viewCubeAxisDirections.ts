import { Vector3 } from 'three'

/** Kierunki ścian w kolejności drei: Right, Left, Top, Bottom, Front, Back. */
export const VIEW_CUBE_FACE_DIRECTIONS: readonly Vector3[] = [
  new Vector3(1, 0, 0),
  new Vector3(-1, 0, 0),
  new Vector3(0, 1, 0),
  new Vector3(0, -1, 0),
  new Vector3(0, 0, 1),
  new Vector3(0, 0, -1),
]

export const VIEW_CUBE_FACE_NAMES = ['right', 'left', 'top', 'bottom', 'front', 'back'] as const
