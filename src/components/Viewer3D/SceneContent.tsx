import type { Dispatch, SetStateAction } from 'react'
import type { BufferGeometry } from 'three'
import { Bounds } from '@react-three/drei'
import { FitModelOnLoad } from '../../features/viewer-camera/FitModelOnLoad'
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
}: SceneContentProps) {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#8fa3b8', 1.35]} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[12, 18, 10]} intensity={2.6} />
      <directionalLight position={[-10, 8, -12]} intensity={1.35} />
      {model && (
        <Bounds margin={1.2}>
          <FitModelOnLoad model={model} loadToken={modelLoadToken} />
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
        </Bounds>
      )}
    </>
  )
}
