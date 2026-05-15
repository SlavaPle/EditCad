/** Identyfikator formatu pliku kompozycji elementów (JSON). */
export const ELEMENT_COMPOSITION_FORMAT = 'editcad.element-composition' as const

export const ELEMENT_COMPOSITION_VERSION = 1 as const

/** Oś profilu / elementu nadrzędnego do reguł rozmieszczenia. */
export type CompositionAxis = 'x' | 'y' | 'z'

/**
 * Specyfikacja masy pojedynczego elementu lub węzła kontenera.
 * Obliczenia (formula, linear, density) — w kolejnych fazach; na razie tylko struktura.
 */
export type MassSpec =
  | { kind: 'fixed'; kg: number }
  | { kind: 'linear'; kgPerM: number; lengthRef?: string }
  | { kind: 'density'; kgPerM3: number; volumeRef?: string }
  | { kind: 'sumChildren' }
  | { kind: 'formula'; expression: string }

/**
 * Warunek wyboru wariantu lub dziecka (np. profil A1 do 5000 mm, A2 od 5001 mm).
 */
export type ElementSelector =
  | { kind: 'always' }
  | { kind: 'lengthMm'; minMm?: number; maxMm?: number }
  | { kind: 'formula'; when: string }

/**
 * Reguła rozmieszczenia względem elementu nadrzędnego
 * (np. 3 szt. na profil, co 1000 mm wzdłuż osi).
 */
export type ElementPlacement =
  | { kind: 'included' }
  | { kind: 'countPerParent'; count: number }
  | { kind: 'spacingAlongParent'; spacingMm: number; axis?: CompositionAxis }
  | { kind: 'formula'; expression: string }

/** Węzeł drzewa kompozycji — wariant, detal lub kontener. */
export type ElementCompositionNode = {
  id: string
  name?: string
  /** Odwołanie do katalogu / prepared element (przyszłe powiązanie). */
  ref?: string
  selector?: ElementSelector
  placement?: ElementPlacement
  /** Masa tego węzła (własna, bez dzieci — zależnie od kind w MassSpec). */
  mass?: MassSpec
  /**
   * Masa całkowita kontenera (np. profil + wszystkie dzieci).
   * Przy `sumChildren` — suma potomków; w przyszłości także formuły.
   */
  totalMass?: MassSpec
  /** Warianty wykluczające się (np. profil A1 vs A2). */
  variants?: ElementCompositionNode[]
  /** Elementy zagnieżdżone (np. B, C w profilu). */
  children?: ElementCompositionNode[]
  /** Dowolne pola rozszerzeń (materiał, norma, opis techniczny). */
  details?: Record<string, unknown>
  /** Nazwane formuły obliczeniowe (wyrażenia — ewaluacja w kolejnej fazie). */
  formulas?: Record<string, string>
}

/** Główny dokument JSON kompozycji gotowego elementu. */
export type ElementCompositionFile = {
  format: typeof ELEMENT_COMPOSITION_FORMAT
  version: typeof ELEMENT_COMPOSITION_VERSION
  id: string
  name: string
  selector?: ElementSelector
  placement?: ElementPlacement
  mass?: MassSpec
  totalMass?: MassSpec
  variants?: ElementCompositionNode[]
  children?: ElementCompositionNode[]
  details?: Record<string, unknown>
  formulas?: Record<string, string>
}

export type ParseElementCompositionResult =
  | { ok: true; file: ElementCompositionFile }
  | { ok: false; error: string }
