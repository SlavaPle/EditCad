// Typy dla modeli i sceny — rozbudowa w kolejnych fazach
import type { BufferGeometry } from 'three'

/** Załadowana geometria modelu (wynik loadModel). */
export type LoadedModelGeometry = BufferGeometry

export type LoadedPreparedElementMetadata = {
  name: string
  constraints: import('../lib/preparedElementFormat').PreparedElementConstraints
}

/** Wynik udanej lub nieudanej próby załadowania. */
export type LoadModelResult =
  | {
      ok: true
      geometry: LoadedModelGeometry
      format: 'stl' | 'ecdprt'
      prepared?: LoadedPreparedElementMetadata
    }
  | { ok: false; error: string }
