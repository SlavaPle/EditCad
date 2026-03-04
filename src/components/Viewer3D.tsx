import { useEffect, useState } from 'react'
import type { BufferGeometry } from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { SceneContent } from './Viewer3D/SceneContent'
import styles from './Viewer3D.module.css'
import { createEmptySelection, type SelectionState } from '../lib/selection'
import type { ModelSelectionInteractionMode } from '../features/model-selection/types'

export interface Viewer3DProps {
  model?: BufferGeometry | null
  interactionMode: ModelSelectionInteractionMode
}

export function Viewer3D({ model, interactionMode }: Viewer3DProps) {
  const [selection, setSelection] = useState<SelectionState>(createEmptySelection())

  useEffect(() => {
    setSelection(createEmptySelection())
  }, [interactionMode])

  return (
    <div className={styles.viewer}>
      <Canvas
        className={styles.canvas}
        camera={{ position: [5, 5, 5], fov: 50 }}
        gl={{ antialias: true }}
        onPointerMissed={() => setSelection(createEmptySelection())}
      >
        <SceneContent
          model={model}
          selection={selection}
          onSelectionChange={setSelection}
          interactionMode={interactionMode}
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
          onPointerDown={() => setSelection(createEmptySelection())}
        />
        <Environment preset="studio" />
      </Canvas>
    </div>
  )
}
