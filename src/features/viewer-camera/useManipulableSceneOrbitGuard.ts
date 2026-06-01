import { useEffect, useRef, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import type { Object3D } from 'three'
import { Vector2 } from 'three'
import { isSceneManipulatorPointerButton, rayHitsObjectRoots } from './pointerRouting'
import { forceResumeAllSceneOrbit, resumeSceneOrbit, suspendSceneOrbit } from './orbitControlsSuspend'

export type ManipulableSceneRoot = {
  rootRef: RefObject<Object3D | null>
  enabled: boolean
}

/**
 * Zasada globalna: LKM/ŚKM na manipulowalnym obiekcie → nie obracamy widoku;
 * ten sam przycisk na pustej scenie → OrbitControls (patrz Viewer3D).
 */
export function useManipulableSceneOrbitGuard(layers: readonly ManipulableSceneRoot[]) {
  const { gl, camera, raycaster, controls } = useThree()
  const pointerNdc = useRef(new Vector2())
  const pointersOnManipulableRef = useRef(new Set<number>())

  useEffect(() => {
    const activeLayers = layers.filter((layer) => layer.enabled)
    if (activeLayers.length === 0) return

    const canvas = gl.domElement

    const activeRoots = (): Object3D[] =>
      activeLayers
        .map((layer) => layer.rootRef.current)
        .filter((root): root is Object3D => root != null)

    const hitsManipulable = (clientX: number, clientY: number): boolean =>
      rayHitsObjectRoots(
        activeRoots(),
        raycaster,
        camera,
        clientX,
        clientY,
        canvas,
        pointerNdc.current,
      )

    const releasePointer = (pointerId: number) => {
      const pointers = pointersOnManipulableRef.current
      if (!pointers.delete(pointerId)) return
      if (pointers.size === 0) {
        resumeSceneOrbit(controls)
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!isSceneManipulatorPointerButton(event.button)) return
      if (!hitsManipulable(event.clientX, event.clientY)) return

      event.preventDefault()
      const pointers = pointersOnManipulableRef.current
      if (!pointers.has(event.pointerId)) {
        pointers.add(event.pointerId)
        suspendSceneOrbit(controls)
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (!isSceneManipulatorPointerButton(event.button)) return
      releasePointer(event.pointerId)
    }

    canvas.addEventListener('pointerdown', onPointerDown, { capture: true })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown, { capture: true })
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      pointersOnManipulableRef.current.clear()
      forceResumeAllSceneOrbit(controls)
    }
  }, [camera, controls, gl.domElement, layers, raycaster])
}
