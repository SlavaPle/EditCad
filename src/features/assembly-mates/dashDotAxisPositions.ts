/**
 * Sztrichpunktir (dash–dot) wzdłuż odcinka.
 * Skala wzorca od długości osi (zawsze kilka powtórzeń), z lekkim wpływem rozmiaru modelu.
 */
export function dashDotAxisPositions(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  /** Charakterystyczny rozmiar modelu (np. boundingSphere.radius). */
  modelScale?: number,
): Float32Array {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const dz = to[2] - from[2]
  const len = Math.hypot(dx, dy, dz)
  if (len < 1e-12) {
    return new Float32Array([from[0], from[1], from[2], to[0], to[1], to[2]])
  }
  const ux = dx / len
  const uy = dy / len
  const uz = dz / len

  // ~4–5 cykli na długości osi; modelScale tylko ogranicza ekstremalne przypadki
  const ms = modelScale && modelScale > 1e-9 ? modelScale : len
  let pattern = len / 4.5
  pattern = Math.min(pattern, ms * 0.1)
  pattern = Math.max(pattern, Math.min(len / 2.8, ms * 0.008))
  pattern = Math.min(pattern, len * 0.45)

  const dash = pattern * 0.5
  const gap = pattern * 0.16
  const dot = pattern * 0.12
  const cycle = dash + gap + dot + gap

  const segs: number[] = []
  let t = 0
  let guard = 0
  while (t < len - 1e-9 && guard < 400) {
    guard += 1
    const dashEnd = Math.min(t + dash, len)
    if (dashEnd > t + 1e-12) {
      segs.push(
        from[0] + ux * t,
        from[1] + uy * t,
        from[2] + uz * t,
        from[0] + ux * dashEnd,
        from[1] + uy * dashEnd,
        from[2] + uz * dashEnd,
      )
    }
    t = dashEnd + gap
    if (t >= len) break
    const dotEnd = Math.min(t + dot, len)
    if (dotEnd > t + 1e-12) {
      segs.push(
        from[0] + ux * t,
        from[1] + uy * t,
        from[2] + uz * t,
        from[0] + ux * dotEnd,
        from[1] + uy * dotEnd,
        from[2] + uz * dotEnd,
      )
    }
    t = dotEnd + gap
    if (cycle < 1e-12) break
  }
  if (segs.length < 6) {
    return new Float32Array([from[0], from[1], from[2], to[0], to[1], to[2]])
  }

  // Krótkie „czapki” na końcach osi (zamiast Points/Sphere — bez raycast)
  const tip = Math.min(dash * 0.45, len * 0.06)
  if (tip > 1e-9) {
    segs.push(
      from[0],
      from[1],
      from[2],
      from[0] + ux * tip,
      from[1] + uy * tip,
      from[2] + uz * tip,
      to[0] - ux * tip,
      to[1] - uy * tip,
      to[2] - uz * tip,
      to[0],
      to[1],
      to[2],
    )
  }
  return new Float32Array(segs)
}
