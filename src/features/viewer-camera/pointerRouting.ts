import type { Camera, Object3D, Raycaster } from 'three'
import { Vector2 } from 'three'

/** LKM / ŚKM na detalu — przesuwanie / obrót; PPM — orbit widoku. */
export const SCENE_MANIPULATOR_POINTER_BUTTONS = [0, 1] as const

export type SceneManipulatorPointerButton = (typeof SCENE_MANIPULATOR_POINTER_BUTTONS)[number]

export function isSceneManipulatorPointerButton(button: number): button is SceneManipulatorPointerButton {
  return button === 0 || button === 1
}

export function clientToPointerNdc(
  clientX: number,
  clientY: number,
  canvas: HTMLElement,
  out: Vector2,
): Vector2 {
  const rect = canvas.getBoundingClientRect()
  out.x = ((clientX - rect.left) / rect.width) * 2 - 1
  out.y = -((clientY - rect.top) / rect.height) * 2 + 1
  return out
}

/** Promień trafia w którąkolwiek z grup manipulowalnych obiektów. */
export function rayHitsObjectRoots(
  roots: readonly Object3D[],
  raycaster: Raycaster,
  camera: Camera,
  clientX: number,
  clientY: number,
  canvas: HTMLElement,
  ndcScratch: Vector2,
): boolean {
  if (roots.length === 0) return false
  clientToPointerNdc(clientX, clientY, canvas, ndcScratch)
  raycaster.setFromCamera(ndcScratch, camera)
  for (const root of roots) {
    if (!root) continue
    const hits = raycaster.intersectObject(root, true)
    if (hits.length > 0) return true
  }
  return false
}
