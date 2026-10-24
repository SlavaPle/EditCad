/** Stonowane kolory osi CAD: X / Y / Z. */
export const AXIS_GIZMO_COLORS = ['#b86a76', '#6a9e7e', '#6a88b0'] as const

export const AXIS_GIZMO_LABEL_KEYS = [
  'viewer.axisGizmo.axisX',
  'viewer.axisGizmo.axisY',
  'viewer.axisGizmo.axisZ',
] as const

export type AxisGizmoLabelKey = (typeof AXIS_GIZMO_LABEL_KEYS)[number]

/** Skala grupy w przestrzeni ortograficznego HUD (px). */
export const AXIS_GIZMO_SCALE = 42

/** Odstęp od lewego dolnego rogu widoku (px). */
export const AXIS_GIZMO_MARGIN: [number, number] = [64, 64]

/** Domyślna grubość i długość belki osi [długość, grubość, grubość]. */
export const AXIS_GIZMO_AXIS_SCALE: [number, number, number] = [0.8, 0.035, 0.035]

/** Przezroczystość belek osi (mniej wyróżniające się). */
export const AXIS_GIZMO_AXIS_OPACITY = 0.72

/**
 * Priorytet warstwy Hud — wyższy niż ViewCube (1),
 * żeby nie czyścić koloru tła (tylko depth).
 */
export const AXIS_GIZMO_RENDER_PRIORITY = 2

export function buildAxisGizmoLabels(
  translate: (key: AxisGizmoLabelKey) => string,
): [string, string, string] {
  return [
    translate(AXIS_GIZMO_LABEL_KEYS[0]),
    translate(AXIS_GIZMO_LABEL_KEYS[1]),
    translate(AXIS_GIZMO_LABEL_KEYS[2]),
  ]
}
