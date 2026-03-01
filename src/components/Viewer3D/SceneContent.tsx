import type { BufferGeometry } from 'three'
import { Bounds } from '@react-three/drei'

interface SceneContentProps {
  model?: BufferGeometry | null
}

// Oświetlenie i załadowany model (STL → BufferGeometry); Bounds dopasowuje kamerę do modelu
export function SceneContent({ model }: SceneContentProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      {model && (
        <Bounds fit observe margin={1.2}>
          <mesh geometry={model}>
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
        </Bounds>
      )}
    </>
  )
}
