import { clampOpacity } from './modelAppearance'

/** Emisyjność «szarego» korpusu w trybie całkowicie nieprzezroczystym (meshStandardMaterial). */
export const MESH_STANDARD_BODY_EMISSIVE_INTENSITY_OPAQUE = 0.42 as const

export type BodyTransparencyRenderState = {
  /** Po clampowaniu 0…1 */
  opacity: number
  transparent: boolean
  depthWrite: boolean
  /** Przy alpha < 1: DoubleSide, żeby widać odwrotne ściany przez model. */
  doubleSided: boolean
  meshStandardEmissiveIntensity: number
}

/**
 * Ustawienia renderowania korpusu modelu: przezroczystość, zapis głębokości, obustronność, emisja.
 */
export function getBodyTransparencyRenderState(rawOpacity: number): BodyTransparencyRenderState {
  const opacity = clampOpacity(rawOpacity)
  const opaque = opacity >= 1
  return {
    opacity,
    transparent: !opaque,
    depthWrite: opaque,
    doubleSided: !opaque,
    meshStandardEmissiveIntensity: opaque ? MESH_STANDARD_BODY_EMISSIVE_INTENSITY_OPAQUE : 0,
  }
}
