/** Kolejność zgodna z GizmoViewcube (drei): Right, Left, Top, Bottom, Front, Back. */
export const VIEW_CUBE_FACE_KEYS = [
  'viewer.viewCube.faceRight',
  'viewer.viewCube.faceLeft',
  'viewer.viewCube.faceTop',
  'viewer.viewCube.faceBottom',
  'viewer.viewCube.faceFront',
  'viewer.viewCube.faceBack',
] as const

export type ViewCubeFaceLabelKey = (typeof VIEW_CUBE_FACE_KEYS)[number]

export function buildViewCubeFaceLabels(
  translate: (key: ViewCubeFaceLabelKey) => string,
): string[] {
  return VIEW_CUBE_FACE_KEYS.map((key) => translate(key))
}
