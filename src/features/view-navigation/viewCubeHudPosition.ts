export type ViewCubeHudAlignment = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

export type ViewportSize = { width: number; height: number }

/** Pozycja HUD kostki widoku w pikselach (środek układu canvas). */
export function computeViewCubeHudPosition(
  alignment: ViewCubeHudAlignment,
  margin: readonly [number, number],
  size: ViewportSize,
): [number, number] {
  const [marginX, marginY] = margin
  const x = alignment.endsWith('left') ? -size.width / 2 + marginX : size.width / 2 - marginX
  const y = alignment.startsWith('top') ? size.height / 2 - marginY : -size.height / 2 + marginY
  return [x, y]
}
