// Filtr typów zaznaczania przy wyborze „w pobliżu” (później np. pasek narzędzi)
export type ModelSelectionProximityFilter = {
  facePlane: boolean
  edgeLine: boolean
  vertex: boolean
}

export const DEFAULT_MODEL_SELECTION_PROXIMITY_FILTER: ModelSelectionProximityFilter = {
  facePlane: true,
  edgeLine: true,
  vertex: true,
}
