// Placeholder: oświetlenie i ewentualna siatka pomocnicza; model będzie dodawany przez ModelLoader
export function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      {/* Miejsce na załadowany model — przekazywany przez context/store */}
    </>
  )
}
