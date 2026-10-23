/** Kolor konturu aktywnego detalu w montażu (klik w drzewie / viewport). */
export const ACTIVE_PROGRAM_PART_OUTLINE_COLOR = '#38bdf8'

export const PROGRAM_PART_PLACEHOLDER_COLOR = '#64748b'

/** Czy rysować kontur podświetlenia dla detalu programu. */
export function shouldShowActiveProgramPartOutline(isActive: boolean): boolean {
  return isActive === true
}

/** Kolor placeholderu (brak geometrii) — jaśniejszy gdy detal aktywny. */
export function programPartPlaceholderColor(isActive: boolean): string {
  return isActive ? ACTIVE_PROGRAM_PART_OUTLINE_COLOR : PROGRAM_PART_PLACEHOLDER_COLOR
}
