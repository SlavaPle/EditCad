/** Oś belki wzdłuż lokalnego +X; rotacja ustawia kierunek świata. */
export type AxisGizmoBeamSpec = {
  readonly axis: 'x' | 'y' | 'z'
  readonly rotation: readonly [number, number, number]
}

/** Pozycja etykiety na końcu osi (jednostkowa). */
export type AxisGizmoLabelSpec = {
  readonly axis: 'x' | 'y' | 'z'
  readonly position: readonly [number, number, number]
}

/** Belki X / Y / Z (jak w drei GizmoViewport). */
export const AXIS_GIZMO_BEAMS: readonly AxisGizmoBeamSpec[] = [
  { axis: 'x', rotation: [0, 0, 0] },
  { axis: 'y', rotation: [0, 0, Math.PI / 2] },
  { axis: 'z', rotation: [0, -Math.PI / 2, 0] },
] as const

/** Etykiety na dodatnich końcach osi. */
export const AXIS_GIZMO_LABEL_POSITIONS: readonly AxisGizmoLabelSpec[] = [
  { axis: 'x', position: [1, 0, 0] },
  { axis: 'y', position: [0, 1, 0] },
  { axis: 'z', position: [0, 0, 1] },
] as const

/** Środek belki w lokalnym +X (połowa długości 0.8). */
export const AXIS_GIZMO_BEAM_CENTER: readonly [number, number, number] = [0.4, 0, 0]

export function axisGizmoColorIndex(axis: 'x' | 'y' | 'z'): 0 | 1 | 2 {
  if (axis === 'x') return 0
  if (axis === 'y') return 1
  return 2
}
