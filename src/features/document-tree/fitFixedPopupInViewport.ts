/**
 * Dopasowanie position:fixed do okna — gdy anchor na dole, popup nie wychodzi poza viewport.
 */

export type FitFixedPopupInput = {
  left: number
  top: number
  width: number
  height: number
  viewportWidth: number
  viewportHeight: number
  /** Margines od krawędzi okna (px). */
  margin?: number
}

export type FitFixedPopupResult = {
  left: number
  top: number
}

export function fitFixedPopupInViewport(params: FitFixedPopupInput): FitFixedPopupResult {
  const margin = params.margin ?? 8
  const vw = Math.max(0, params.viewportWidth)
  const vh = Math.max(0, params.viewportHeight)
  const w = Math.max(0, params.width)
  const h = Math.max(0, params.height)

  let left = params.left
  let top = params.top

  if (left + w > vw - margin) {
    left = vw - margin - w
  }
  if (left < margin) left = margin

  if (top + h > vh - margin) {
    top = vh - margin - h
  }
  if (top < margin) top = margin

  return { left, top }
}
