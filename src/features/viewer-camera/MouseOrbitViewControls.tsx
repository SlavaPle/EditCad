import { forwardRef, useEffect, useMemo, type ComponentProps } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { OrbitControls } from 'three-stdlib'
import { updateOrbitViewFromMouse } from './orbitViewRotation'

type OrbitControlsProps = ComponentProps<'primitive'> & {
  makeDefault?: boolean
  camera?: OrbitControls['object']
  domElement?: HTMLElement
  enableDamping?: boolean
  keyEvents?: boolean | HTMLElement
  onChange?: () => void
  onStart?: () => void
  onEnd?: () => void
  regress?: boolean
}

/**
 * OrbitControls ze środkowym przyciskiem myszy — aktualizacja przez updateOrbitViewFromMouse.
 */
export const MouseOrbitViewControls = forwardRef<OrbitControls, OrbitControlsProps>(
  function MouseOrbitViewControls(
    {
      makeDefault,
      camera,
      regress,
      domElement,
      enableDamping = true,
      keyEvents = false,
      onChange,
      onStart,
      onEnd,
      ...restProps
    },
    ref,
  ) {
    const invalidate = useThree((state) => state.invalidate)
    const defaultCamera = useThree((state) => state.camera)
    const gl = useThree((state) => state.gl)
    const events = useThree((state) => state.events)
    const set = useThree((state) => state.set)
    const get = useThree((state) => state.get)
    const performance = useThree((state) => state.performance)
    const explCamera = camera ?? defaultCamera
    const explDomElement = domElement ?? events.connected ?? gl.domElement

    const controls = useMemo(() => new OrbitControlsImpl(explCamera), [explCamera])

    useFrame((_, delta) => {
      updateOrbitViewFromMouse(controls, delta)
    }, -1)

    useEffect(() => {
      if (keyEvents) {
        controls.connect(keyEvents === true ? explDomElement : keyEvents)
      }
      controls.connect(explDomElement)
      return () => {
        controls.dispose()
      }
    }, [keyEvents, explDomElement, controls])

    useEffect(() => {
      const callback = () => {
        invalidate()
        if (regress) performance.regress()
        onChange?.()
      }
      const onStartCb = () => onStart?.()
      const onEndCb = () => onEnd?.()
      controls.addEventListener('change', callback)
      controls.addEventListener('start', onStartCb)
      controls.addEventListener('end', onEndCb)
      return () => {
        controls.removeEventListener('start', onStartCb)
        controls.removeEventListener('end', onEndCb)
        controls.removeEventListener('change', callback)
      }
    }, [onChange, onStart, onEnd, controls, invalidate, performance, regress])

    useEffect(() => {
      if (!makeDefault) return
      const old = get().controls
      set({ controls })
      return () => set({ controls: old })
    }, [makeDefault, controls, get, set])

    return (
      <primitive
        ref={ref}
        object={controls}
        enableDamping={enableDamping}
        {...restProps}
      />
    )
  },
)
