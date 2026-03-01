import type { BufferGeometry } from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { SceneContent } from './Viewer3D/SceneContent'
import styles from './Viewer3D.module.css'

export interface Viewer3DProps {
  model?: BufferGeometry | null
}

export function Viewer3D({ model }: Viewer3DProps) {
  return (
    <div className={styles.viewer}>
      <Canvas
        className={styles.canvas}
        camera={{ position: [5, 5, 5], fov: 50 }}
        gl={{ antialias: true }}
      >
        <SceneContent model={model} />
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
        />
        <Environment preset="studio" />
      </Canvas>
    </div>
  )
}
