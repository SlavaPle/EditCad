import { useRef, useState } from 'react'
import type { BufferGeometry } from 'three'
import { Toolbar } from './components/Toolbar'
import { Viewer3D } from './components/Viewer3D'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import type { ModelLoaderHandle } from './components/ModelLoader'
import styles from './App.module.css'

function App() {
  const [model, setModel] = useState<BufferGeometry | null>(null)
  const [modelKey, setModelKey] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const modelLoaderRef = useRef<ModelLoaderHandle>(null)

  const handleReset = () => {
    setModel(null)
    setLoadError(null)
    setModelKey((k) => k + 1)
  }

  const handleModelLoad = (geometry: BufferGeometry) => {
    setModel(geometry)
    setLoadError(null)
  }

  const handleLoadModelClick = () => {
    modelLoaderRef.current?.openFileDialog()
  }

  return (
    <div className={styles.app}>
      <Toolbar onReset={handleReset} onLoadModelClick={handleLoadModelClick} />
      <div className={styles.main}>
        <LeftPanel
          modelLoaderRef={modelLoaderRef}
          onModelLoad={handleModelLoad}
          onLoadError={setLoadError}
          loadError={loadError}
          hasModel={!!model}
        />
        <div className={styles.viewport}>
          <Viewer3D key={modelKey} model={model} />
        </div>
        <RightPanel />
      </div>
    </div>
  )
}

export default App
