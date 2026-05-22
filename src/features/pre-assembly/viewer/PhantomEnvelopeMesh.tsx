import { useMemo } from 'react'
import { Edges } from '@react-three/drei'
import { DoubleSide } from 'three'
import type { EnvelopeSizeMm } from '../phantomGeometry'
import { mmToScene } from '../phantomUnits'

const ENVELOPE_COLOR = '#38bdf8'
const ENVELOPE_OPACITY = 0.22
const ENVELOPE_EDGE_COLOR = '#7dd3fc'

interface PhantomEnvelopeMeshProps {
  sizeMm: EnvelopeSizeMm
}

/** Półprzezroczysty prostopadłościan-koperta fantomu. */
export function PhantomEnvelopeMesh({ sizeMm }: PhantomEnvelopeMeshProps) {
  const [sx, sy, sz] = useMemo(
    () => [mmToScene(sizeMm.x), mmToScene(sizeMm.y), mmToScene(sizeMm.z)],
    [sizeMm.x, sizeMm.y, sizeMm.z],
  )

  if (sx <= 0 || sy <= 0 || sz <= 0) return null

  return (
    <mesh>
      <boxGeometry args={[sx, sy, sz]} />
      <meshStandardMaterial
        color={ENVELOPE_COLOR}
        transparent
        opacity={ENVELOPE_OPACITY}
        depthWrite={false}
        side={DoubleSide}
      />
      <Edges color={ENVELOPE_EDGE_COLOR} linewidth={1} />
    </mesh>
  )
}
