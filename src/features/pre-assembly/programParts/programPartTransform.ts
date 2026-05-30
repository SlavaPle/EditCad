import type { PhantomTransform } from '../model'
import { phantomRootRotationRad } from '../phantomGeometry'
import { mmToScene } from '../phantomUnits'

export function defaultProgramPartTransform(): PhantomTransform {
  return {
    positionMm: [0, 0, 0],
    rotationDeg: [0, 0, 0],
  }
}

export function programPartGroupPosition(
  transform: PhantomTransform,
): [number, number, number] {
  return [
    mmToScene(transform.positionMm[0]),
    mmToScene(transform.positionMm[1]),
    mmToScene(transform.positionMm[2]),
  ]
}

export function programPartGroupRotation(
  transform: PhantomTransform,
): [number, number, number] {
  return phantomRootRotationRad(transform)
}

export function updateProgramPartInList(
  parts: readonly { id: string; transform: PhantomTransform }[],
  partId: string,
  transform: PhantomTransform,
): typeof parts {
  return parts.map((part) =>
    part.id === partId ? { ...part, transform: { ...transform } } : part,
  )
}
