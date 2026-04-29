import type { Dispatch, SetStateAction } from 'react'
import type { BufferGeometry } from 'three'
import { Bounds } from '@react-three/drei'
import { SelectableModel } from './SelectableModel'
import type { SelectionState } from '../../lib/selection'
import type { ModelSelectionProximityFilter } from '../../features/model-selection/types'

interface SceneContentProps {
  model?: BufferGeometry | null
  geometryRevision: number
  selection: SelectionState
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>
  selectionProximityFilter: ModelSelectionProximityFilter
}

export function SceneContent({
  model,
  geometryRevision,
  selection,
  onSelectionChange,
  selectionProximityFilter,
}: SceneContentProps) {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#8fa3b8', 1.35]} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[12, 18, 10]} intensity={2.6} />
      <directionalLight position={[-10, 8, -12]} intensity={1.35} />
      {model && (
        <Bounds fit observe margin={1.2}>
          <SelectableModel
            model={model}
            geometryRevision={geometryRevision}
            selection={selection}
            onSelectionChange={onSelectionChange}
            selectionProximityFilter={selectionProximityFilter}
          />
        </Bounds>
      )}
    </>
  )
}
