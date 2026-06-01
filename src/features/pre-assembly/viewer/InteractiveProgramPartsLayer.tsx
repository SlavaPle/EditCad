import { useCallback, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import type { Dispatch, SetStateAction } from 'react'
import { Bounds, Edges } from '@react-three/drei'
import { Box3, BufferGeometry, Vector3 } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { SelectableModel } from '../../../components/Viewer3D/SelectableModel'
import type { SelectionState } from '../../../lib/selection'
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
import { useProgramPartPointerSession } from './useProgramPartPointerSession'
import { useProgramPartOrbitGuard } from './useProgramPartOrbitGuard'
import { useProgramPartTransformsRef } from './programPartTransformsRef'

const PLACEHOLDER_COLOR = '#64748b'
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
}: InteractiveProgramPartsLayerProps) {
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
      setTransform(partId, transform)
      setTransformPreviewTick((tick) => tick + 1)
    },
    [setTransform],
  )

  const handlePartTransformCommit = useCallback(
    (partId: string, transform: PhantomTransform) => {
      setTransform(partId, transform)
      onPartTransformChange(partId, transform)
    },
    [onPartTransformChange, setTransform],
  )

  const partsRootRef = useRef<Group>(null)
  useProgramPartOrbitGuard(partsRootRef, preAssemblyActive)

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
  })

  if (parts.length === 0) return null

  void transformPreviewTick

  // fit + key=fitToken: kamera tylko przy dodaniu/usunięciu detalu, nie przy drag (bez observe)
  return (
    <Bounds margin={1.2} fit key={fitToken}>
      <group ref={partsRootRef}>
        {parts.map((part) => (
          <InteractiveProgramPart
            key={part.id}
            part={part}
            displayTransform={getTransform(part.id, part.transform)}
            geometry={geometries[part.id] ?? null}
            appearance={resolveProgramPartAppearance(part.id, appearances)}
            displayMode={displayMode}
            preAssemblyActive={preAssemblyActive}
            isActive={activePartId === part.id}
            selection={selection}
            onSelectionChange={onSelectionChange}
            selectionProximityFilter={selectionProximityFilter}
            onProbableFacesChange={handleProbableFacesChange}
            onPartPointerDown={onPartPointerDown}
          />
        ))}
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
  isActive,
  selection,
  onSelectionChange,
  selectionProximityFilter,
  onProbableFacesChange,
  onPartPointerDown,
}: {
  part: PreAssemblyProgramPart
  displayTransform: PhantomTransform
  geometry: BufferGeometry | null
  appearance: ModelAppearance
  displayMode: ModelDisplayMode
  preAssemblyActive: boolean
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
  const allowFacePick = preAssemblyActive && isActive

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!preAssemblyActive) return
    onPartPointerDown(part.id, displayTransform, geometry, event)
  }

  if (geometry) {
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
            pickOnPointerDown={allowFacePick}
            onMeshPointerDown={preAssemblyActive ? handlePointerDown : undefined}
          />
        </group>
      </group>
    )
  }

  const placeholderSize = mmToScene(PLACEHOLDER_SIZE_MM)
  return (
    <mesh position={position} rotation={rotation} onPointerDown={handlePointerDown}>
      <boxGeometry args={[placeholderSize, placeholderSize, placeholderSize]} />
      <meshStandardMaterial color={PLACEHOLDER_COLOR} wireframe />
      <Edges color={PLACEHOLDER_COLOR} />
    </mesh>
  )
}
