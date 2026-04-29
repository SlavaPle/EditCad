import type { Dispatch, SetStateAction } from 'react'
import { Color, MOUSE, NoToneMapping, SRGBColorSpace, type BufferGeometry } from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { SceneContent } from './Viewer3D/SceneContent'
import styles from './Viewer3D.module.css'
import { createEmptySelection, type SelectionState } from '../lib/selection'
import type { ModelSelectionProximityFilter } from '../features/model-selection/types'

const VIEWER_BACKGROUND = '#2d3b52'

export interface Viewer3DProps {
  model?: BufferGeometry | null
  /** Inkrement po edycji wierzchołków (np. rozciągnięcie między ścianami). */
  geometryRevision: number
  selection: SelectionState
  onSelectionChange: Dispatch<SetStateAction<SelectionState>>
  selectionProximityFilter: ModelSelectionProximityFilter
}

export function Viewer3D({
  model,
  geometryRevision,
  selection,
  onSelectionChange,
  selectionProximityFilter,
}: Viewer3DProps) {
  return (
    <div className={styles.viewer}>
      <Canvas
        className={styles.canvas}
        camera={{ position: [5, 5, 5], fov: 50, near: 0.01, far: 1_000_000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl, scene }) => {
          gl.outputColorSpace = SRGBColorSpace
          gl.toneMapping = NoToneMapping
          scene.background = new Color(VIEWER_BACKGROUND)
        }}
        onPointerMissed={(ev) => {
          // Tylko LKM czyści zaznaczenie; obrót widoku (śPM) nie dotyka selekcji
          if (ev.shiftKey || ev.button !== 0) return
          onSelectionChange(createEmptySelection())
        }}
      >
        <SceneContent
          model={model}
          geometryRevision={geometryRevision}
          selection={selection}
          onSelectionChange={onSelectionChange}
          selectionProximityFilter={selectionProximityFilter}
        />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          mouseButtons={{
            // Wartość spoza ROTATE/DOLLY/PAN — brak orbitu na LKM (wybór elementów)
            LEFT: -1 as unknown as (typeof MOUSE)['ROTATE'],
            MIDDLE: MOUSE.ROTATE,
            RIGHT: MOUSE.PAN,
          }}
        />
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
            // Tylko LKM na siatce czyści zaznaczenie
            if (!shiftHeld && e.nativeEvent.button === 0) {
              onSelectionChange(createEmptySelection())
            }
          }}
        />
      </Canvas>
    </div>
  )
}
