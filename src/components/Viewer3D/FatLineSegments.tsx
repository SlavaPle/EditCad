import { useEffect, useLayoutEffect, useMemo } from 'react'
import { Color } from 'three'
import { useThree } from '@react-three/fiber'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

type LineMaterialInstance = InstanceType<typeof LineMaterial>

export interface FatLineSegmentsProps {
  /** Pary (x,y,z) — (x,y,z) na segment; długość wielokrotność 6 */
  positions: Float32Array | null
  color: string
  /** Szerokość w pikselach ekranu (worldUnits: false) */
  linewidth?: number
  renderOrder?: number
  raycastDisabled?: boolean
  depthWrite?: boolean
}

// Odcinki z Line2 — grubość niezależna od ograniczeń WebGL linewidth
export function FatLineSegments({
  positions,
  color,
  linewidth = 5,
  renderOrder = 0,
  raycastDisabled = false,
  depthWrite = true,
}: FatLineSegmentsProps) {
  const size = useThree((s) => s.size)

  const lineObject = useMemo(() => {
    if (!positions || positions.length < 6) return null

    const geo = new LineSegmentsGeometry()
    geo.setPositions(positions)

    const mat = new LineMaterial({
      color: new Color(color).getHex(),
      linewidth,
      worldUnits: false,
      depthWrite,
      depthTest: true,
    })
    mat.resolution.set(size.width, size.height)

    const line = new LineSegments2(geo, mat)
    line.renderOrder = renderOrder
    if (raycastDisabled) {
      line.raycast = () => {}
    }
    return line
  }, [positions, color, linewidth, renderOrder, raycastDisabled, depthWrite, size.width, size.height])

  useLayoutEffect(() => {
    if (!lineObject) return
    const mat = lineObject.material as LineMaterialInstance
    mat.resolution.set(size.width, size.height)
  }, [lineObject, size.width, size.height, size])

  useEffect(() => {
    if (!lineObject) return
    return () => {
      lineObject.geometry.dispose()
      lineObject.material.dispose()
    }
  }, [lineObject])

  if (!lineObject) return null

  return <primitive object={lineObject} />
}
