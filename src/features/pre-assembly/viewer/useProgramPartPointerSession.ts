import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import type { BufferGeometry, Mesh } from 'three'
import { Vector2, Vector3 } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { PhantomTransform } from '../model'
import {
  applyPickMeshElementResult,
  pickMeshElementAtPointer,
} from '../../model-selection/pickMeshElement'
import type { ModelSelectionProximityFilter } from '../../model-selection/types'
import type { SelectionState } from '../../../lib/selection'
import { resumeSceneOrbit, suspendSceneOrbit } from '../../viewer-camera/orbitControlsSuspend'
import type { MatesPickSlot } from '../../assembly-mates/matesPickMode'
import {
  beginProgramPartPointerSession,
  computeRotateTransform,
  computeTranslateTransform,
  createProgramPartDragPlane,
  finishProgramPartPointerSession,
  intersectRayWithDragPlaneMm,
  markProgramPartSessionDragged,
  pointerSessionShouldDrag,
  programPartPointerModeFromButton,
  type ProgramPartPointerSession,
} from './programPartPointerInteraction'

const scratchCameraDir = new Vector3()
const scratchLocal = new Vector3()

type ActiveSession = ProgramPartPointerSession & {
  downEvent: ThreeEvent<PointerEvent>
}

export type ProgramPartPointerSessionHandlers = {
  /** Podgląd podczas drag — tylko ref (bez setState co klatkę). */
  onPartTransformPreview: (partId: string, transform: PhantomTransform) => void
  /** Zatwierdzenie transformu (React state + zapis do .ecdasm). */
  onPartTransformCommit: (partId: string, transform: PhantomTransform) => void
  getPartTransform: (partId: string, fallback: PhantomTransform) => PhantomTransform
  onActivePartChange: (partId: string) => void
  onSelectionChange: (selection: SelectionState) => void
  onProbableFacesChange?: (faces: readonly number[]) => void
  selection: SelectionState
  selectionProximityFilter: ModelSelectionProximityFilter
  probableFaces: readonly number[]
  getPrimaryFaces: () => readonly number[]
  setPrimaryFaces: (faces: readonly number[]) => void
  /** Tryb wyboru płaszczyzny przywiązania — bez drag detalu. */
  matesPickActive?: boolean
  matesPickSlotRef?: RefObject<MatesPickSlot | null>
}

export function useProgramPartPointerSession(handlers: ProgramPartPointerSessionHandlers) {
  const { raycaster, camera, gl, controls } = useThree()
  const sessionRef = useRef<ActiveSession | null>(null)
  const liveTransformRef = useRef<PhantomTransform | null>(null)
  const meshRef = useRef<Mesh | null>(null)
  const geometryRef = useRef<BufferGeometry | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const setBodyCursor = useCallback((cursor: string | null) => {
    document.body.style.cursor = cursor ?? ''
  }, [])

  const endSession = useCallback(() => {
    sessionRef.current = null
    liveTransformRef.current = null
    meshRef.current = null
    geometryRef.current = null
    setBodyCursor(null)
    resumeSceneOrbit(controls)
  }, [controls, setBodyCursor])

  const pointerNdc = useMemo(() => new Vector2(), [])
  const rayFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect()
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointerNdc, camera)
      return raycaster.ray
    },
    [camera, gl.domElement, pointerNdc, raycaster],
  )

  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      const session = sessionRef.current
      if (!session || session.pointerId !== ev.pointerId) return

      if (!session.dragged && pointerSessionShouldDrag(session, ev.clientX, ev.clientY)) {
        sessionRef.current = { ...markProgramPartSessionDragged(session), downEvent: session.downEvent }
        setBodyCursor(session.mode === 'rotate' ? 'ew-resize' : 'grabbing')
      }

      const active = sessionRef.current
      if (!active?.dragged) return

      const h = handlersRef.current
      if (active.mode === 'rotate') {
        const transform = computeRotateTransform(active, ev.clientX, ev.clientY)
        liveTransformRef.current = transform
        h.onPartTransformPreview(active.partId, transform)
        return
      }

      camera.getWorldDirection(scratchCameraDir)
      const plane = createProgramPartDragPlane(active.startTransform.positionMm, scratchCameraDir)
      const ray = rayFromClient(ev.clientX, ev.clientY)
      const hit = intersectRayWithDragPlaneMm(ray, plane)
      if (!hit) return
      const transform = computeTranslateTransform(active, hit)
      liveTransformRef.current = transform
      h.onPartTransformPreview(active.partId, transform)
    }

    const onUp = (ev: PointerEvent) => {
      const session = sessionRef.current
      if (!session || session.pointerId !== ev.pointerId) return

      const h = handlersRef.current
      const finalTransform =
        liveTransformRef.current ?? {
          positionMm: [...session.startTransform.positionMm] as PhantomTransform['positionMm'],
          rotationDeg: [...session.startTransform.rotationDeg] as PhantomTransform['rotationDeg'],
        }
      const finish = finishProgramPartPointerSession(session, finalTransform)

      if (finish.kind === 'drag') {
        h.onPartTransformCommit(session.partId, finish.transform)
        endSession()
        return
      } else if (session.downEvent.nativeEvent.button === 0) {
        h.onActivePartChange(session.partId)
        const mesh = meshRef.current
        const geometry = geometryRef.current
        if (mesh && geometry) {
          mesh.worldToLocal(scratchLocal.copy(session.downEvent.point))
          const result = pickMeshElementAtPointer({
            model: geometry,
            mesh,
            event: session.downEvent,
            selectionProximityFilter: h.selectionProximityFilter,
            currentSelection: h.selection,
            currentPrimaryFaces: h.getPrimaryFaces(),
            probableFaces: h.probableFaces,
            shiftHeld: false,
            localPoint: scratchLocal,
          })
          applyPickMeshElementResult(result, {
            onSelectionChange: h.onSelectionChange,
            onProbableFacesChange: h.onProbableFacesChange,
            setPrimaryFaces: h.setPrimaryFaces,
          })
        }
      }

      endSession()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [camera, endSession, rayFromClient, setBodyCursor])

  const onPartPointerDown = useCallback(
    (
      partId: string,
      fallbackTransform: PhantomTransform,
      geometry: BufferGeometry | null,
      event: ThreeEvent<PointerEvent>,
    ) => {
      if (handlersRef.current.matesPickSlotRef?.current ?? handlersRef.current.matesPickActive) {
        return
      }
      const mode = programPartPointerModeFromButton(event.nativeEvent.button)
      if (!mode || !geometry) return

      event.stopPropagation()
      if (mode === 'rotate') {
        event.nativeEvent.preventDefault()
      }

      const mesh = event.object as Mesh
      meshRef.current = mesh
      geometryRef.current = geometry

      const transform = handlersRef.current.getPartTransform(partId, fallbackTransform)
      const dragPlaneHitMm =
        mode === 'translate'
          ? (() => {
              event.camera.getWorldDirection(scratchCameraDir)
              const plane = createProgramPartDragPlane(transform.positionMm, scratchCameraDir)
              return intersectRayWithDragPlaneMm(event.ray, plane)
            })()
          : null

      suspendSceneOrbit(controls)

      const base = beginProgramPartPointerSession({
        partId,
        mode,
        pointerId: event.nativeEvent.pointerId,
        clientX: event.nativeEvent.clientX,
        clientY: event.nativeEvent.clientY,
        transform,
        dragPlaneHitMm,
      })
      sessionRef.current = { ...base, downEvent: event }
      liveTransformRef.current = {
        positionMm: [...transform.positionMm] as PhantomTransform['positionMm'],
        rotationDeg: [...transform.rotationDeg] as PhantomTransform['rotationDeg'],
      }
    },
    [],
  )

  return { onPartPointerDown }
}
