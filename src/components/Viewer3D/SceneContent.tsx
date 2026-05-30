import type { Dispatch, SetStateAction } from 'react'
import type { BufferGeometry } from 'three'
import { Bounds } from '@react-three/drei'
import { FitModelOnLoad } from '../../features/viewer-camera/FitModelOnLoad'
import { ModelOrbitFocusSync } from '../../features/viewer-camera/ModelOrbitFocusSync'
import type {
  ElementPropertyValues,
  PhantomAssembly,
} from '../../features/pre-assembly'
import type { PreAssemblyProgramPart } from '../../features/pre-assembly'
import {
  ElementInstanceLayer,
  PhantomAssemblyLayer,
  ProgramPartsLayer,
} from '../../features/pre-assembly/viewer'
import { SelectableModel } from './SelectableModel'
import type { SelectionState } from '../../lib/selection'
import type { ModelSelectionProximityFilter } from '../../features/model-selection/types'
import {
  DEFAULT_MODEL_DISPLAY_MODE,
  type ModelDisplayMode,
} from '../../features/viewer-display/modelDisplayMode'
import {
  DEFAULT_MODEL_APPEARANCE,
  type ModelAppearance,
} from '../../features/viewer-display/modelAppearance'

interface SceneContentProps {
  model?: BufferGeometry | null
  /** Token ładowania pliku (modelKey) — wywołuje fit widoku tylko przy nowej detali. */
  modelLoadToken: number
  geometryRevision: number
  displayMode?: ModelDisplayMode
  appearance?: ModelAppearance
  selection: SelectionState
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>
  selectionProximityFilter: ModelSelectionProximityFilter
  onProbableFacesChange?: (faces: readonly number[]) => void
  /** Aktywny fantom-skręcenie (.ecdpre) — warstwa koperty i elementów. */
  phantom?: PhantomAssembly | null
  phantomElementGeometries?: Readonly<Record<string, BufferGeometry | null>>
  phantomElementProperties?: Readonly<Record<string, ElementPropertyValues>>
  selectedPhantomAnchorId?: string | null
  selectedPhantomElementId?: string | null
  programParts?: readonly PreAssemblyProgramPart[]
  programPartGeometries?: Readonly<Record<string, BufferGeometry | null>>
  programPartsFitToken?: number
}

export function SceneContent({
  model,
  modelLoadToken,
  geometryRevision,
  displayMode = DEFAULT_MODEL_DISPLAY_MODE,
  appearance = DEFAULT_MODEL_APPEARANCE,
  selection,
  onSelectionChange,
  selectionProximityFilter,
  onProbableFacesChange,
  phantom = null,
  phantomElementGeometries = {},
  phantomElementProperties = {},
  selectedPhantomAnchorId = null,
  selectedPhantomElementId = null,
  programParts = [],
  programPartGeometries = {},
  programPartsFitToken = 0,
}: SceneContentProps) {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#8fa3b8', 1.35]} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[12, 18, 10]} intensity={2.6} />
      <directionalLight position={[-10, 8, -12]} intensity={1.35} />
      {programParts.length > 0 && (
        <ProgramPartsLayer
          parts={programParts}
          geometries={programPartGeometries}
          fitToken={programPartsFitToken}
        />
      )}
      {phantom && (
        <>
          <PhantomAssemblyLayer
            phantom={phantom}
            elementProperties={phantomElementProperties}
            selectedAnchorId={selectedPhantomAnchorId}
          />
          <ElementInstanceLayer
            phantom={phantom}
            elementGeometries={phantomElementGeometries}
            elementProperties={phantomElementProperties}
            selectedElementId={selectedPhantomElementId}
          />
        </>
      )}
      {model && (
        <Bounds margin={1.2}>
          <SelectableModel
            model={model}
            geometryRevision={geometryRevision}
            displayMode={displayMode}
            appearance={appearance}
            selection={selection}
            onSelectionChange={onSelectionChange}
            selectionProximityFilter={selectionProximityFilter}
            onProbableFacesChange={onProbableFacesChange}
          />
          <ModelOrbitFocusSync model={model} geometryRevision={geometryRevision} />
          <FitModelOnLoad model={model} loadToken={modelLoadToken} />
        </Bounds>
      )}
    </>
  )
}
