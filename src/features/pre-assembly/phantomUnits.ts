/** Jednostki sceny Three.js = mm (zgodnie z loadModel / STL). */
export function mmToScene(valueMm: number): number {
  return valueMm
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function sceneToMm(valueScene: number): number {
  return valueScene
}
