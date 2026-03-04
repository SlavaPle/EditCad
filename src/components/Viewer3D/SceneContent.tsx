import type { Dispatch, SetStateAction } from 'react'
import type { BufferGeometry } from 'three'
import { Bounds } from '@react-three/drei'
import { SelectableModel } from './SelectableModel'
import type { SelectionState } from '../../lib/selection'
import type { ModelSelectionInteractionMode } from '../../features/model-selection/types'

interface SceneContentProps {
  model?: BufferGeometry | null
  selection: SelectionState
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>
  interactionMode: ModelSelectionInteractionMode
}

// Oświetlenie i interaktywny model (STL → BufferGeometry); Bounds dopasowuje kamerę do modelu
export function SceneContent({
  model,
  selection,
  onSelectionChange,
  interactionMode,
}: SceneContentProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      {model && (
        <Bounds fit observe margin={1.2}>
          <SelectableModel
            model={model}
            selection={selection}
            onSelectionChange={onSelectionChange}
            interactionMode={interactionMode}
          />
        </Bounds>
      )}
    </>
  )
}
