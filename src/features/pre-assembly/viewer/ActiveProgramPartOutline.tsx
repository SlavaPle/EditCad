import { Edges } from '@react-three/drei'
import type { BufferGeometry } from 'three'
import {
  ACTIVE_PROGRAM_PART_OUTLINE_COLOR,
  shouldShowActiveProgramPartOutline,
} from './activeProgramPartHighlight'

export { ACTIVE_PROGRAM_PART_OUTLINE_COLOR } from './activeProgramPartHighlight'

type ActiveProgramPartOutlineProps = {
  geometry: BufferGeometry
  visible?: boolean
}

/**
 * Podświetlenie całego detalu — krawędzie siatki bez raycastu (nie zasłania picków).
 */
export function ActiveProgramPartOutline({
  geometry,
  visible = true,
}: ActiveProgramPartOutlineProps) {
  if (!shouldShowActiveProgramPartOutline(visible)) return null

  return (
    <mesh geometry={geometry} raycast={() => undefined}>
      <meshBasicMaterial visible={false} />
      <Edges threshold={20} color={ACTIVE_PROGRAM_PART_OUTLINE_COLOR} linewidth={2} />
    </mesh>
  )
}
