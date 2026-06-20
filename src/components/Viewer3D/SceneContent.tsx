import type { Dispatch, SetStateAction, RefObject } from 'react'
import type { BufferGeometry } from 'three'
import { Bounds } from '@react-three/drei'
import { FitModelOnLoad } from '../../features/viewer-camera/FitModelOnLoad'
import { ModelOrbitFocusSync } from '../../features/viewer-camera/ModelOrbitFocusSync'
import type {
  ElementPropertyValues,
  PhantomAssembly,
  PhantomTransform,
} from '../../features/pre-assembly'
import type { PreAssemblyProgramPart } from '../../features/pre-assembly'
import type { MatePlaneRef } from '../../features/assembly-mates/model'
import type { MatesPickMode, MatesPickSlot } from '../../features/assembly-mates/matesPickMode'
import {
  ElementInstanceLayer,
  InteractiveProgramPartsLayer,
  PhantomAssemblyLayer,
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
  programPartAppearances?: Readonly<Record<string, ModelAppearance | undefined>>
  programPartsFitToken?: number
  preAssemblyActive?: boolean
  activeProgramPartId?: string | null
  onActiveProgramPartChange?: (partId: string | null) => void
  onProgramPartTransformChange?: (partId: string, transform: PhantomTransform) => void
  resolveMateFollowers?: (
    movedPartId: string,
    movedTransform: PhantomTransform,
  ) => readonly PreAssemblyProgramPart[]
  matesPickMode?: MatesPickMode
  matesPickSlotRef?: RefObject<MatesPickSlot | null>
  onMatePlanePicked?: (slot: NonNullable<MatesPickMode['slot']>, plane: MatePlaneRef) => void
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
  programPartAppearances = {},
  programPartsFitToken = 0,
  preAssemblyActive = false,
  activeProgramPartId = null,
  onActiveProgramPartChange,
  onProgramPartTransformChange,
  resolveMateFollowers,
  matesPickMode = { active: false, slot: null },
  matesPickSlotRef,
  onMatePlanePicked,
}: SceneContentProps) {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#8fa3b8', 1.35]} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[12, 18, 10]} intensity={2.6} />
      <directionalLight position={[-10, 8, -12]} intensity={1.35} />
      {programParts.length > 0 && onProgramPartTransformChange && onActiveProgramPartChange && (
        <InteractiveProgramPartsLayer
          parts={programParts}
          geometries={programPartGeometries}
          appearances={programPartAppearances}
          displayMode={displayMode}
          fitToken={programPartsFitToken}
          preAssemblyActive={preAssemblyActive}
          activePartId={activeProgramPartId}
          onActivePartChange={onActiveProgramPartChange}
          selection={selection}
          onSelectionChange={onSelectionChange}
          selectionProximityFilter={selectionProximityFilter}
          onProbableFacesChange={onProbableFacesChange}
          onPartTransformChange={onProgramPartTransformChange}
          resolveMateFollowers={resolveMateFollowers}
          matesPickMode={matesPickMode}
          matesPickSlotRef={matesPickSlotRef}
          onMatePlanePicked={onMatePlanePicked}
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
      {model && programParts.length === 0 && (
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
