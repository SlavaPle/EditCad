import { useEffect, useRef, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import type { Group } from 'three'
import { Vector2 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

/**
 * Przechwytuje ŚKM na canvas zanim OrbitControls zacznie obrót widoku,
 * gdy promień trafia w grupę detali programu.
 */
export function useProgramPartOrbitGuard(
  partsRootRef: RefObject<Group | null>,
  preAssemblyActive: boolean,
) {
  const { gl, camera, raycaster, controls } = useThree()
  const pointerNdc = useRef(new Vector2())
  const orbitSuspendedRef = useRef(false)
  const orbitEnabledBeforeRef = useRef(true)

  useEffect(() => {
    if (!preAssemblyActive) return

    const canvas = gl.domElement

    const resumeOrbit = () => {
      if (!orbitSuspendedRef.current) return
      const orbit = controls as OrbitControlsImpl | null
      if (orbit) orbit.enabled = orbitEnabledBeforeRef.current
      orbitSuspendedRef.current = false
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 1) return
      const root = partsRootRef.current
      if (!root) return

      const rect = canvas.getBoundingClientRect()
      pointerNdc.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointerNdc.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointerNdc.current, camera)
      const hits = raycaster.intersectObject(root, true)
      if (hits.length === 0) return

      event.preventDefault()
      const orbit = controls as OrbitControlsImpl | null
      if (orbit && !orbitSuspendedRef.current) {
        orbitEnabledBeforeRef.current = orbit.enabled
        orbit.enabled = false
        orbitSuspendedRef.current = true
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 1) return
      resumeOrbit()
    }

    canvas.addEventListener('pointerdown', onPointerDown, { capture: true })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown, { capture: true })
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      resumeOrbit()
    }
  }, [camera, controls, gl.domElement, partsRootRef, preAssemblyActive, raycaster])
}
