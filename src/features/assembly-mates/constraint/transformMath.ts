import { Euler, Matrix4, Quaternion, Vector3 } from 'three'

import type { PhantomTransform } from '../../pre-assembly/model'

import { degToRad } from '../../pre-assembly/phantomUnits'



const RAD_TO_DEG = 180 / Math.PI



export function rotationDegFromMatrix(rot: Matrix4): PhantomTransform['rotationDeg'] {

  const euler = new Euler().setFromRotationMatrix(rot, 'XYZ')

  return [

    euler.x * RAD_TO_DEG,

    euler.y * RAD_TO_DEG,

    euler.z * RAD_TO_DEG,

  ] as PhantomTransform['rotationDeg']

}



export function quaternionFromTransform(transform: PhantomTransform): Quaternion {

  return new Quaternion().setFromEuler(

    new Euler(

      degToRad(transform.rotationDeg[0]),

      degToRad(transform.rotationDeg[1]),

      degToRad(transform.rotationDeg[2]),

      'XYZ',

    ),

  )

}



const scratchAxis = new Vector3()



/** Minimalny obrót z `from` do `to`. */

export function quaternionAlignDirections(from: Vector3, to: Vector3): Quaternion {

  const f = from.clone().normalize()

  const t = to.clone().normalize()

  const dot = f.dot(t)

  if (dot > 1 - 1e-6) {

    return new Quaternion()

  }

  if (dot < -1 + 1e-6) {

    scratchAxis.set(Math.abs(f.x) < 0.9 ? 1 : 0, Math.abs(f.x) < 0.9 ? 0 : 1, 0)

    scratchAxis.cross(f).normalize()

    return new Quaternion().setFromAxisAngle(scratchAxis, Math.PI)

  }

  return new Quaternion().setFromUnitVectors(f, t)

}



export function rotateTransformAroundPivot(

  transform: PhantomTransform,

  pivotWorld: Vector3,

  qAlign: Quaternion,

): PhantomTransform {

  const pos = new Vector3(...transform.positionMm)

  const qCurrent = quaternionFromTransform(transform)

  const qNew = qAlign.clone().multiply(qCurrent)

  const newRot = new Matrix4().makeRotationFromQuaternion(qNew)

  const offset = pos.clone().sub(pivotWorld)

  offset.applyQuaternion(qAlign)

  const newPos = pivotWorld.clone().add(offset)



  return {

    positionMm: [newPos.x, newPos.y, newPos.z] as PhantomTransform['positionMm'],

    rotationDeg: rotationDegFromMatrix(newRot),

  }

}



export function translateTransform(

  transform: PhantomTransform,

  delta: Vector3,

): PhantomTransform {

  return {

    ...transform,

    positionMm: [

      transform.positionMm[0] + delta.x,

      transform.positionMm[1] + delta.y,

      transform.positionMm[2] + delta.z,

    ] as PhantomTransform['positionMm'],

  }

}



/** Odległość punktu od linii (niesigned). */

export function pointLineDistance(

  point: Vector3,

  linePoint: Vector3,

  lineDirection: Vector3,

  outClosest = new Vector3(),

): { distance: number; closest: Vector3 } {

  const dir = lineDirection.clone().normalize()

  const w = point.clone().sub(linePoint)

  const t = w.dot(dir)

  outClosest.copy(linePoint).add(dir.multiplyScalar(t))

  return { distance: point.distanceTo(outClosest), closest: outClosest }

}



/** Podpisana odległość punktu od płaszczyzny (normalna znormalizowana). */

export function signedPointPlaneDistance(

  point: Vector3,

  planePoint: Vector3,

  planeNormal: Vector3,

): number {

  return point.clone().sub(planePoint).dot(planeNormal.clone().normalize())

}



/** Podpisana odległość linii od płaszczyzny (punkt na linii). */

export function signedLinePlaneDistance(

  linePoint: Vector3,

  _lineDirection: Vector3,

  planePoint: Vector3,

  planeNormal: Vector3,

): number {

  const n = planeNormal.clone().normalize()

  return signedPointPlaneDistance(linePoint, planePoint, n)

}



/** Najbliższy punkt na linii od punktu `from`, w odległości `radius` (zachowuje kierunek). */

export function pointOnCylinderAroundLine(

  from: Vector3,

  linePoint: Vector3,

  lineDirection: Vector3,

  radius: number,

  out = new Vector3(),

): Vector3 {

  const { closest } = pointLineDistance(from, linePoint, lineDirection, out)

  const radial = from.clone().sub(closest)

  if (radial.lengthSq() < 1e-18) {

    const axis = new Vector3(Math.abs(lineDirection.x) < 0.9 ? 1 : 0, 0, 0)

    axis.cross(lineDirection).normalize()

    return closest.clone().add(axis.multiplyScalar(radius))

  }

  return closest.clone().add(radial.normalize().multiplyScalar(radius))
}

/** Stosuje ten sam ruch sztywny co anchor (before→after) do follower. */
export function applyRigidDeltaToTransform(
  follower: PhantomTransform,
  anchorBefore: PhantomTransform,
  anchorAfter: PhantomTransform,
): PhantomTransform {
  const qBefore = quaternionFromTransform(anchorBefore)
  const qAfter = quaternionFromTransform(anchorAfter)
  const qDelta = qAfter.clone().multiply(qBefore.clone().invert())

  const posBefore = new Vector3(...anchorBefore.positionMm)
  const posAfter = new Vector3(...anchorAfter.positionMm)
  const posFollower = new Vector3(...follower.positionMm)

  const offset = posFollower.clone().sub(posBefore)
  offset.applyQuaternion(qDelta)
  const newPos = posAfter.clone().add(offset)

  const qFollower = quaternionFromTransform(follower)
  const qNew = qDelta.clone().multiply(qFollower)
  const newRot = new Matrix4().makeRotationFromQuaternion(qNew)

  return {
    positionMm: [newPos.x, newPos.y, newPos.z] as PhantomTransform['positionMm'],
    rotationDeg: rotationDegFromMatrix(newRot),
  }
}

