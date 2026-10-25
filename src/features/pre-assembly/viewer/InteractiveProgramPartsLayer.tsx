import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import type { Dispatch, SetStateAction, RefObject } from 'react'
import { Bounds, Edges } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Box3, BufferGeometry, Mesh, Vector3 } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { SelectableModel } from '../../../components/Viewer3D/SelectableModel'
import { createEmptySelection, type SelectionState } from '../../../lib/selection'

/** Współdzielone puste zaznaczenie — nieaktywne detale nie rysują globalnych face indices. */
const NO_PART_FACE_SELECTION: SelectionState = createEmptySelection()
import {
  DEFAULT_MODEL_DISPLAY_MODE,
  type ModelDisplayMode,
} from '../../viewer-display/modelDisplayMode'
import type { ModelAppearance } from '../../viewer-display/modelAppearance'
import { resolveProgramPartAppearance } from '../programParts/programPartAppearance'
import type { ModelSelectionProximityFilter } from '../../model-selection/types'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import type { PhantomTransform } from '../model'
import { mmToScene } from '../phantomUnits'
import {
  programPartGroupPosition,
  programPartGroupRotation,
} from '../programParts/programPartTransform'
import type { MateEntityRef } from '../../assembly-mates/model'
import type { MateEntityHighlights } from '../../assembly-mates/matePlaneFaceOverlay'
import { MatePlaneFaceOverlay } from '../../assembly-mates/matePlaneFaceOverlayView'
import { MateLineOverlay } from '../../assembly-mates/mateLineOverlayView'
import { MateEllipseOverlay } from '../../assembly-mates/mateEllipseOverlayView'
import { MateVertexOverlay } from '../../assembly-mates/mateVertexOverlayView'
import {
  mateEllipseHighlightsForPart,
  mateLineHighlightsForPart,
  matePlaneHighlightsForPart,
  mateVertexHighlightsForPart,
} from '../../assembly-mates/matePlaneFaceOverlay'
import type { MatesPickMode, MatesPickSlot } from '../../assembly-mates/matesPickMode'
import {
  meshBuiltinFacePickOnPointerDown,
  pickMateEntityAtPointer,
  resolveActiveMatesPickSlot,
} from '../../assembly-mates/pickMateEntityAtPointer'
import { useProgramPartPointerSession } from './useProgramPartPointerSession'
import { useManipulableSceneOrbitGuard } from '../../viewer-camera/useManipulableSceneOrbitGuard'
import { useProgramPartTransformsRef } from './programPartTransformsRef'
import { ActiveProgramPartOutline } from './ActiveProgramPartOutline'
import { programPartPlaceholderColor } from './activeProgramPartHighlight'

const PLACEHOLDER_SIZE_MM = 40

interface InteractiveProgramPartsLayerProps {
  parts: readonly PreAssemblyProgramPart[]
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>
  appearances?: Readonly<Record<string, ModelAppearance | undefined>>
  displayMode?: ModelDisplayMode
  fitToken?: number
  preAssemblyActive: boolean
  activePartId: string | null
  onActivePartChange: (partId: string | null) => void
  selection: SelectionState
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>
  selectionProximityFilter: ModelSelectionProximityFilter
  onProbableFacesChange?: (faces: readonly number[]) => void
  onPartTransformChange: (partId: string, transform: PhantomTransform) => void
  resolveMateFollowers?: (
    movedPartId: string,
    movedTransform: PhantomTransform,
  ) => readonly PreAssemblyProgramPart[]
  isPartLocked?: (partId: string) => boolean
  matesPickMode?: MatesPickMode
  /** Detal zajęty drugim slotem — bez hover/pick podczas wyboru mate. */
  matesPickExcludePartId?: string | null
  mateEntityHighlights?: MateEntityHighlights | null
  matesPickSlotRef?: RefObject<MatesPickSlot | null>
  onMateEntityPicked?: (slot: NonNullable<MatesPickMode['slot']>, entity: MateEntityRef) => void
  onMateFaceClick?: (payload: {
    partId: string
    seedFaceIndex: number
    faceIndices: readonly number[]
    modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }
  }) => void
}

export function InteractiveProgramPartsLayer({
  parts,
  geometries,
  appearances = {},
  displayMode = DEFAULT_MODEL_DISPLAY_MODE,
  fitToken = 0,
  preAssemblyActive,
  activePartId,
  onActivePartChange,
  selection,
  onSelectionChange,
  selectionProximityFilter,
  onProbableFacesChange,
  onPartTransformChange,
  resolveMateFollowers,
  isPartLocked,
  matesPickMode = { active: false, slot: null },
  matesPickExcludePartId = null,
  mateEntityHighlights = null,
  matesPickSlotRef,
  onMateEntityPicked,
  onMateFaceClick,
}: InteractiveProgramPartsLayerProps) {
  const { invalidate } = useThree()
  useEffect(() => {
    invalidate()
  }, [
    invalidate,
    matesPickMode.active,
    matesPickMode.slot,
    matesPickExcludePartId,
    mateEntityHighlights,
    activePartId,
  ])

  const [probableFaces, setProbableFaces] = useState<readonly number[]>([])
  const [transformPreviewTick, setTransformPreviewTick] = useState(0)
  const primaryFacesRef = useRef<readonly number[]>([])

  const setPrimaryFaces = useCallback((faces: readonly number[]) => {
    primaryFacesRef.current = faces
  }, [])

  const getPrimaryFaces = useCallback(() => primaryFacesRef.current, [])

  const handleProbableFacesChange = useCallback(
    (faces: readonly number[]) => {
      setProbableFaces(faces)
      onProbableFacesChange?.(faces)
    },
    [onProbableFacesChange],
  )

  const { getTransform, setTransform } = useProgramPartTransformsRef(parts)

  const handlePartTransformPreview = useCallback(
    (partId: string, transform: PhantomTransform) => {
      if (isPartLocked?.(partId)) return
      const resolved = resolveMateFollowers?.(partId, transform)
      if (resolved) {
        for (const part of resolved) {
          if (isPartLocked?.(part.id)) continue
          setTransform(part.id, part.transform)
        }
      } else {
        setTransform(partId, transform)
      }
      setTransformPreviewTick((tick) => tick + 1)
    },
    [isPartLocked, resolveMateFollowers, setTransform],
  )

  const handlePartTransformCommit = useCallback(
    (partId: string, transform: PhantomTransform) => {
      if (isPartLocked?.(partId)) return
      setTransform(partId, transform)
      onPartTransformChange(partId, transform)
    },
    [isPartLocked, onPartTransformChange, setTransform],
  )

  const assemblyInteractionActive = preAssemblyActive || matesPickMode.active

  const handleMatePartPointerDown = useCallback(
    (
      partId: string,
      geometry: BufferGeometry,
      event: ThreeEvent<PointerEvent>,
    ) => {
      if (matesPickExcludePartId && partId === matesPickExcludePartId) return
      const slot = resolveActiveMatesPickSlot(matesPickSlotRef?.current, matesPickMode.slot)
      const result = pickMateEntityAtPointer({
        partId,
        geometry,
        mesh: event.object as Mesh,
        worldPoint: event.point,
        faceIndex: event.faceIndex,
        pickSlot: slot,
        pointerButton: event.nativeEvent.button,
        camera: event.camera,
        pointer: { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY },
        viewport: {
          width: (event.nativeEvent.target as HTMLElement | null)?.clientWidth ?? 0,
          height: (event.nativeEvent.target as HTMLElement | null)?.clientHeight ?? 0,
        },
      })
      if (!result.ok) return

      event.stopPropagation()
      onMateEntityPicked?.(result.slot, result.entity)
    },
    [matesPickExcludePartId, matesPickMode.slot, matesPickSlotRef, onMateEntityPicked],
  )

  const partsRootRef = useRef<Group>(null)
  const manipulableSceneLayers = useMemo(
    () => [{ rootRef: partsRootRef, enabled: assemblyInteractionActive }],
    [assemblyInteractionActive],
  )
  useManipulableSceneOrbitGuard(manipulableSceneLayers)

  const { onPartPointerDown } = useProgramPartPointerSession({
    onPartTransformPreview: handlePartTransformPreview,
    onPartTransformCommit: handlePartTransformCommit,
    getPartTransform: getTransform,
    onActivePartChange: (partId) => onActivePartChange(partId),
    onSelectionChange: (next) => onSelectionChange(next),
    onProbableFacesChange: handleProbableFacesChange,
    selection,
    selectionProximityFilter,
    probableFaces,
    getPrimaryFaces,
    setPrimaryFaces,
    matesPickActive: (matesPickSlotRef?.current ?? matesPickMode.slot) !== null,
    matesPickSlotRef,
    isPartLocked,
    onMateFaceClick: matesPickMode.active ? undefined : onMateFaceClick,
  })

  /** Blokada natywnego menu — otwarcie Add mate robi kontener Viewer3D. */
  const suppressNativeContextMenu = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.nativeEvent.preventDefault()
  }, [])

  if (parts.length === 0) return null

  void transformPreviewTick

  return (
    <Bounds margin={1.2} fit key={fitToken}>
      <group ref={partsRootRef}>
        {parts.map((part) => {
          const isActive = activePartId === part.id
          // SelectionState nie ma partId — overlay tylko na aktywnej detali (indeksy ścian
          // z innej geometrii nie mogą trafiać na pozostałe części montażu).
          const partSelection = isActive ? selection : NO_PART_FACE_SELECTION
          return (
          <InteractiveProgramPart
            key={part.id}
            part={part}
            displayTransform={getTransform(part.id, part.transform)}
            geometry={geometries[part.id] ?? null}
            appearance={resolveProgramPartAppearance(part.id, appearances)}
            displayMode={displayMode}
            preAssemblyActive={assemblyInteractionActive}
            matesPickContextActive={matesPickMode.active}
            matesPickActive={matesPickMode.active && matesPickMode.slot !== null}
            matesPickExcluded={
              matesPickMode.active && matesPickExcludePartId === part.id
            }
            isActive={isActive}
            selection={partSelection}
            onSelectionChange={onSelectionChange}
            selectionProximityFilter={selectionProximityFilter}
            onProbableFacesChange={handleProbableFacesChange}
            onPartPointerDown={onPartPointerDown}
            matesPickSlotRef={matesPickSlotRef}
            onMatePartPointerDown={handleMatePartPointerDown}
            onMeshContextMenu={
              preAssemblyActive ? suppressNativeContextMenu : undefined
            }
            mateEntityHighlights={mateEntityHighlights}
          />
          )
        })}
      </group>
    </Bounds>
  )
}

function InteractiveProgramPart({
  part,
  displayTransform,
  geometry,
  appearance,
  displayMode,
  preAssemblyActive,
  matesPickContextActive,
  matesPickActive,
  matesPickExcluded,
  isActive,
  selection,
  onSelectionChange,
  selectionProximityFilter,
  onProbableFacesChange,
  onPartPointerDown,
  matesPickSlotRef,
  onMatePartPointerDown,
  onMeshContextMenu,
  mateEntityHighlights,
}: {
  part: PreAssemblyProgramPart
  displayTransform: PhantomTransform
  geometry: BufferGeometry | null
  appearance: ModelAppearance
  displayMode: ModelDisplayMode
  preAssemblyActive: boolean
  matesPickContextActive: boolean
  matesPickActive: boolean
  matesPickExcluded: boolean
  isActive: boolean
  selection: SelectionState
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>
  selectionProximityFilter: ModelSelectionProximityFilter
  onProbableFacesChange?: (faces: readonly number[]) => void
  onPartPointerDown: (
    partId: string,
    fallbackTransform: PhantomTransform,
    geometry: BufferGeometry | null,
    event: ThreeEvent<PointerEvent>,
  ) => void
  matesPickSlotRef?: RefObject<MatesPickSlot | null>
  onMatePartPointerDown: (
    partId: string,
    geometry: BufferGeometry,
    event: ThreeEvent<PointerEvent>,
  ) => void
  onMeshContextMenu?: (event: ThreeEvent<MouseEvent>) => void
  mateEntityHighlights?: MateEntityHighlights | null
}) {
  const geometryCenterOffset = useMemo(() => {
    if (!geometry) return [0, 0, 0] as [number, number, number]
    geometry.computeBoundingBox()
    const box = geometry.boundingBox ?? new Box3()
    const center = box.getCenter(new Vector3())
    return [-center.x, -center.y, -center.z] as [number, number, number]
  }, [geometry])

  const position = programPartGroupPosition(displayTransform)
  const rotation = programPartGroupRotation(displayTransform)
  const allowFacePick =
    !matesPickExcluded &&
    ((preAssemblyActive && isActive && !matesPickActive) || matesPickActive)
  const meshPickOnPointerDown = meshBuiltinFacePickOnPointerDown(allowFacePick, matesPickContextActive)
  const mateFaces = matePlaneHighlightsForPart(part.id, mateEntityHighlights)
  const mateLines = mateLineHighlightsForPart(part.id, mateEntityHighlights)
  const mateVertices = mateVertexHighlightsForPart(part.id, mateEntityHighlights)
  const mateEllipses = mateEllipseHighlightsForPart(part.id, mateEntityHighlights)

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (matesPickExcluded) return
    // Ref ma pierwszeństwo; props (matesPickActive) jako fallback przy opóźnionym Canvas
    const slotFromRef = matesPickSlotRef?.current
    if (geometry && (slotFromRef != null || matesPickActive)) {
      event.stopPropagation()
      onMatePartPointerDown(part.id, geometry, event)
      return
    }
    if (!preAssemblyActive) return
    onPartPointerDown(part.id, displayTransform, geometry, event)
  }

  if (geometry) {
    if (!geometry.boundingSphere) geometry.computeBoundingSphere()
    return (
      <group position={position} rotation={rotation}>
        <group position={geometryCenterOffset}>
          <SelectableModel
            model={geometry}
            geometryRevision={0}
            displayMode={displayMode}
            appearance={appearance}
            selection={selection}
            onSelectionChange={onSelectionChange}
            selectionProximityFilter={selectionProximityFilter}
            onProbableFacesChange={allowFacePick ? onProbableFacesChange : undefined}
            pickOnPointerDown={meshPickOnPointerDown}
            expandEdgeHoverToEllipse={matesPickContextActive || matesPickActive}
            raycastDisabled={matesPickExcluded}
            onMeshPointerDown={
              matesPickExcluded
                ? undefined
                : preAssemblyActive || matesPickContextActive
                  ? handlePointerDown
                  : undefined
            }
            onMeshContextMenu={matesPickExcluded ? undefined : onMeshContextMenu}
          />
          <ActiveProgramPartOutline geometry={geometry} visible={isActive} />
          {mateFaces.planeA && (
            <MatePlaneFaceOverlay
              geometry={geometry}
              faceIndices={mateFaces.planeA}
              variant="planeA"
            />
          )}
          {mateFaces.planeB && (
            <MatePlaneFaceOverlay
              geometry={geometry}
              faceIndices={mateFaces.planeB}
              variant="planeB"
            />
          )}
          {mateLines.lineA && (
            <MateLineOverlay geometry={geometry} line={mateLines.lineA} variant="planeA" />
          )}
          {mateLines.lineB && (
            <MateLineOverlay geometry={geometry} line={mateLines.lineB} variant="planeB" />
          )}
          {mateVertices.vertexA && (
            <MateVertexOverlay geometry={geometry} vertex={mateVertices.vertexA} variant="planeA" />
          )}
          {mateVertices.vertexB && (
            <MateVertexOverlay geometry={geometry} vertex={mateVertices.vertexB} variant="planeB" />
          )}
          {mateEllipses.ellipseA && (
            <MateEllipseOverlay
              geometry={geometry}
              ellipse={mateEllipses.ellipseA}
              variant="planeA"
            />
          )}
          {mateEllipses.ellipseB && (
            <MateEllipseOverlay
              geometry={geometry}
              ellipse={mateEllipses.ellipseB}
              variant="planeB"
            />
          )}
        </group>
      </group>
    )
  }

  const placeholderSize = mmToScene(PLACEHOLDER_SIZE_MM)
  const placeholderColor = programPartPlaceholderColor(isActive)
  return (
    <mesh
      position={position}
      rotation={rotation}
      raycast={matesPickExcluded ? () => null : undefined}
      onPointerDown={matesPickExcluded ? undefined : handlePointerDown}
      onContextMenu={matesPickExcluded ? undefined : onMeshContextMenu}
    >
      <boxGeometry args={[placeholderSize, placeholderSize, placeholderSize]} />
      <meshStandardMaterial color={placeholderColor} wireframe />
      <Edges color={placeholderColor} />
    </mesh>
  )
}

