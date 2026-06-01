import { useMemo } from 'react'
import { Bounds, Edges } from '@react-three/drei'
import { Box3, BufferGeometry, Vector3 } from 'three'
import { SelectableModel } from '../../../components/Viewer3D/SelectableModel'
import { DEFAULT_MODEL_SELECTION_PROXIMITY_FILTER } from '../../model-selection/types'
import { createEmptySelection } from '../../../lib/selection'
import {
  DEFAULT_MODEL_DISPLAY_MODE,
  type ModelDisplayMode,
} from '../../viewer-display/modelDisplayMode'
import type { ModelAppearance } from '../../viewer-display/modelAppearance'
import { resolveProgramPartAppearance } from '../programParts/programPartAppearance'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import { mmToScene } from '../phantomUnits'
import { layoutProgramPartPositionsMm } from './layoutProgramPartPositionsMm'

const PLACEHOLDER_COLOR = '#64748b'
const PLACEHOLDER_SIZE_MM = 40

interface ProgramPartsLayerProps {
  parts: readonly PreAssemblyProgramPart[]
  geometries: Readonly<Record<string, BufferGeometry | null | undefined>>
  appearances?: Readonly<Record<string, ModelAppearance | undefined>>
  displayMode?: ModelDisplayMode
  fitToken?: number
}

/** Detale programu (.ecdprt) w widoku 3D — niezależnie od fantomu. */
export function ProgramPartsLayer({
  parts,
  geometries,
  appearances = {},
  displayMode = DEFAULT_MODEL_DISPLAY_MODE,
  fitToken = 0,
}: ProgramPartsLayerProps) {
  const positionsMm = useMemo(
    () => layoutProgramPartPositionsMm(
      parts.map((part) => part.id),
      geometries,
    ),
    [parts, geometries],
  )

  if (parts.length === 0) return null

  return (
    <Bounds margin={1.2} fit key={fitToken}>
      <group>
        {parts.map((part) => (
          <ProgramPartMesh
            key={part.id}
            geometry={geometries[part.id] ?? null}
            appearance={resolveProgramPartAppearance(part.id, appearances)}
            displayMode={displayMode}
            positionMm={positionsMm[part.id] ?? [0, 0, 0]}
          />
        ))}
      </group>
    </Bounds>
  )
}

function ProgramPartMesh({
  geometry,
  appearance,
  displayMode,
  positionMm,
}: {
  geometry: BufferGeometry | null
  appearance: ModelAppearance
  displayMode: ModelDisplayMode
  positionMm: [number, number, number]
}) {
  const geometryCenterOffset = useMemo(() => {
    if (!geometry) return [0, 0, 0] as [number, number, number]
    geometry.computeBoundingBox()
    const box = geometry.boundingBox ?? new Box3()
    const center = box.getCenter(new Vector3())
    return [-center.x, -center.y, -center.z] as [number, number, number]
  }, [geometry])

  const position: [number, number, number] = [
    mmToScene(positionMm[0]),
    mmToScene(positionMm[1]),
    mmToScene(positionMm[2]),
  ]

  if (geometry) {
    return (
      <group position={position}>
        <group position={geometryCenterOffset}>
          <SelectableModel
            model={geometry}
            geometryRevision={0}
            displayMode={displayMode}
            appearance={appearance}
            selection={createEmptySelection()}
            onSelectionChange={() => {}}
            selectionProximityFilter={DEFAULT_MODEL_SELECTION_PROXIMITY_FILTER}
            pickOnPointerDown={false}
          />
        </group>
      </group>
    )
  }

  const placeholderSize = mmToScene(PLACEHOLDER_SIZE_MM)
  return (
    <mesh position={position}>
      <boxGeometry args={[placeholderSize, placeholderSize, placeholderSize]} />
      <meshStandardMaterial color={PLACEHOLDER_COLOR} wireframe />
      <Edges color={PLACEHOLDER_COLOR} />
    </mesh>
  )
}
