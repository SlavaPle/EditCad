import type { BoundsApi } from '@react-three/drei'

/** Jednorazowe dopasowanie kamery do zawartości Bounds (np. po załadowaniu detalu). */
export function fitModelToView(api: BoundsApi | null | undefined): void {
  if (!api) return
  api.refresh().reset().fit()
  api.clip()
}
