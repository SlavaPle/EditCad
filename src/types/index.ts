// Typy dla modeli i sceny — rozbudowa w kolejnych fazach
import type { BufferGeometry } from 'three'

/** Załadowana geometria modelu (wynik loadModel). */
export type LoadedModelGeometry = BufferGeometry

/** Wynik udanej lub nieudanej próby załadowania. */
export type LoadModelResult =
  | { ok: true; geometry: LoadedModelGeometry; format: 'stl' }
  | { ok: false; error: string }
