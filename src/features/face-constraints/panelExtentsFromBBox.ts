import type { BufferGeometry } from 'three'

/**
 * Minimalna krawędź pudła → grubość; dwie pozostałe (sort rosnąco) → krótsza i dłuższa miara w płaszczyźnie panelu (heurystyka jak w walidacji PANEL).
 */
export type PanelBBoxSpanTriple = {
  thicknessMm: number
  inPlaneMinorMm: number
  inPlaneMajorMm: number
}

export function boundingBoxThicknessAndInPlaneSpansMm(
  geo: BufferGeometry | null | undefined,
): PanelBBoxSpanTriple | null {
  if (!geo) return null
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  if (!bb) return null
  const dx = bb.max.x - bb.min.x
  const dy = bb.max.y - bb.min.y
  const dz = bb.max.z - bb.min.z
  if (!(dx >= 0) || !(dy >= 0) || !(dz >= 0)) return null
  const sorted = [dx, dy, dz].sort((x, y) => x - y)
  const thicknessMm = sorted[0]!
  const inPlaneMinorMm = sorted[1]!
  const inPlaneMajorMm = sorted[2]!
  return { thicknessMm, inPlaneMinorMm, inPlaneMajorMm }
}
