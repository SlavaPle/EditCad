/** Rejestracja dopasowania widoku z wnętrza Bounds (np. ViewCube, skrót klawiszowy). */
export type FitModelToFullViewHandler = () => void

let handler: FitModelToFullViewHandler | null = null

export function registerFitModelToFullViewHandler(fn: FitModelToFullViewHandler | null): void {
  handler = fn
}

export function requestFitModelToFullView(): void {
  handler?.()
}
