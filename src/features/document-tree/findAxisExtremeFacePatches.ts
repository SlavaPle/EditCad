import { Vector3, type BufferGeometry } from 'three'
import { getCoplanarConnectedFaces, getFaceVertices } from '../model-selection/facePlaneSelection'
import type { DocumentTreeAxis } from './model'

const AXIS_ALIGN_DOT_MIN = 0.95

const AXIS_UNIT: Record<DocumentTreeAxis, readonly [number, number, number]> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
}

function faceNormalAndCenter(
  geometry: BufferGeometry,
  faces: readonly (readonly [number, number, number])[],
  faceIndex: number,
  targetNormal: Vector3,
  axisUnit: Vector3,
): { normal: Vector3; centerAlongAxis: number } {
  const position = geometry.getAttribute('position')
  const [ia, ib, ic] = faces[faceIndex]!
  const ax = position.getX(ia)
  const ay = position.getY(ia)
  const az = position.getZ(ia)
  const bx = position.getX(ib)
  const by = position.getY(ib)
  const bz = position.getZ(ib)
  const cx = position.getX(ic)
  const cy = position.getY(ic)
  const cz = position.getZ(ic)

  targetNormal.set(
    (by - ay) * (cz - az) - (bz - az) * (cy - ay),
    (bz - az) * (cx - ax) - (bx - ax) * (cz - az),
    (bx - ax) * (cy - ay) - (by - ay) * (cx - ax),
  )
  targetNormal.normalize()
  const mx = (ax + bx + cx) / 3
  const my = (ay + by + cy) / 3
  const mz = (az + bz + cz) / 3
  const centerAlongAxis = mx * axisUnit.x + my * axisUnit.y + mz * axisUnit.z
  return { normal: targetNormal, centerAlongAxis }
}

export type AxisExtremeFacePatches = {
  faceIndices: number[]
  seedPositive: number
  seedNegative: number
}

/**
 * Dwie skrajne łatki planarne wzdłuż światowej osi AABB (±X / ±Y / ±Z).
 * Używane gdy brak FaceConstraint na danym slocie.
 */
export function findAxisExtremeFacePatches(
  geometry: BufferGeometry,
  axis: DocumentTreeAxis,
): AxisExtremeFacePatches | null {
  const faces = getFaceVertices(geometry)
  if (faces.length === 0) return null

  const [ux, uy, uz] = AXIS_UNIT[axis]
  const axisVec = new Vector3(ux, uy, uz)
  const tmp = new Vector3()

  let bestPos = -1
  let bestPosProj = -Infinity
  let bestNeg = -1
  let bestNegProj = Infinity

  for (let fi = 0; fi < faces.length; fi++) {
    const { normal, centerAlongAxis } = faceNormalAndCenter(geometry, faces, fi, tmp, axisVec)
    const align = normal.dot(axisVec)
    if (align >= AXIS_ALIGN_DOT_MIN) {
      if (centerAlongAxis > bestPosProj) {
        bestPosProj = centerAlongAxis
        bestPos = fi
      }
    } else if (align <= -AXIS_ALIGN_DOT_MIN) {
      if (centerAlongAxis < bestNegProj) {
        bestNegProj = centerAlongAxis
        bestNeg = fi
      }
    }
  }

  if (bestPos < 0 || bestNeg < 0) return null

  const patchA = getCoplanarConnectedFaces(geometry, bestPos)
  const patchB = getCoplanarConnectedFaces(geometry, bestNeg)
  if (patchA.length === 0 || patchB.length === 0) return null

  return {
    faceIndices: [...new Set([...patchA, ...patchB])],
    seedPositive: bestPos,
    seedNegative: bestNeg,
  }
}
