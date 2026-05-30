import { Box3, type BufferGeometry, Vector3 } from 'three'
import type { Vec3Mm } from '../phantomGeometry'

const DEFAULT_PART_SPAN_MM = 80
export const PROGRAM_PART_LAYOUT_GAP_MM = 24

export function geometryExtentMm(geometry: BufferGeometry | null | undefined): {
  sizeMm: { x: number; y: number; z: number }
} {
  if (!geometry) {
    return {
      sizeMm: { x: DEFAULT_PART_SPAN_MM, y: DEFAULT_PART_SPAN_MM, z: DEFAULT_PART_SPAN_MM },
    }
  }
  geometry.computeBoundingBox()
  const box = geometry.boundingBox ?? new Box3()
  const size = box.getSize(new Vector3())
  return { sizeMm: { x: size.x, y: size.y, z: size.z } }
}

/** Układa detale programu w rzędzie wzdłuż osi X (mm). */
export function layoutProgramPartPositionsMm(
  partIds: readonly string[],
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>,
  gapMm = PROGRAM_PART_LAYOUT_GAP_MM,
): Record<string, Vec3Mm> {
  const positions: Record<string, Vec3Mm> = {}
  let cursorX = 0
  for (const id of partIds) {
    const { sizeMm } = geometryExtentMm(geometries[id] ?? null)
    const spanX = Math.max(sizeMm.x, 1)
    const slotCenterX = cursorX + spanX / 2
    positions[id] = [slotCenterX, 0, 0]
    cursorX += spanX + gapMm
  }
  return positions
}
