/** Czy w scenie jest geometria, na którą ma wpływać tryb VIEW (solid / krawędzie / tekstura). */
export function canChangeViewDisplayMode(input: {
  hasMainModel: boolean
  programPartGeometryCount: number
  hasPhantomAssembly: boolean
}): boolean {
  return (
    input.hasMainModel ||
    input.programPartGeometryCount > 0 ||
    input.hasPhantomAssembly
  )
}
