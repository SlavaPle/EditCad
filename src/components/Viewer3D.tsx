import type { Dispatch, SetStateAction } from 'react'
import type { BufferGeometry } from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { SceneContent } from './Viewer3D/SceneContent'
import styles from './Viewer3D.module.css'
import { createEmptySelection, type SelectionState } from '../lib/selection'
import type { ModelSelectionProximityFilter } from '../features/model-selection/types'

export interface Viewer3DProps {
  model?: BufferGeometry | null
  selection: SelectionState
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>
  selectionProximityFilter: ModelSelectionProximityFilter
}

export function Viewer3D({
  model,
  selection,
  onSelectionChange,
  selectionProximityFilter,
}: Viewer3DProps) {
  return (
    <div className={styles.viewer}>
      <Canvas
        className={styles.canvas}
        camera={{ position: [5, 5, 5], fov: 50 }}
        gl={{ antialias: true }}
        onPointerMissed={(ev) => {
          if (!ev.shiftKey) {
            onSelectionChange(createEmptySelection())
          }
        }}
      >
        <SceneContent
          model={model}
          selection={selection}
          onSelectionChange={onSelectionChange}
          selectionProximityFilter={selectionProximityFilter}
        />
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#334155"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#475569"
          fadeDistance={25}
          fadeStrength={1}
          infiniteGrid
          onPointerDown={(e) => {
            const shiftHeld = e.shiftKey || e.nativeEvent.shiftKey
            if (!shiftHeld) {
              onSelectionChange(createEmptySelection())
            }
          }}
        />
        <Environment preset="studio" />
      </Canvas>
    </div>
  )
}
