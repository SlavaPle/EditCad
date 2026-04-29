import { useCallback, useEffect, useRef, useState } from 'react'
import type { BufferGeometry } from 'three'
import { Toolbar } from './components/Toolbar'
import { Viewer3D } from './components/Viewer3D'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import type { ModelLoaderHandle } from './components/ModelLoader'
import { clearMeshTopologyCaches } from './features/model-selection/facePlaneSelection'
import { DEFAULT_MODEL_SELECTION_PROXIMITY_FILTER } from './features/model-selection/types'
import { createEmptySelection, type SelectionState } from './lib/selection'
import { saveGeometryAsStlFile, saveGeometryAsStlFileAs, type BrowserFileHandle } from './lib/saveModel'
import { applyTwoFaceStretch, type TwoFaceStretchError } from './lib/twoFaceStretch'
import styles from './App.module.css'

function App() {
  const [model, setModel] = useState<BufferGeometry | null>(null)
  const [modelKey, setModelKey] = useState(0)
  const [geometryRevision, setGeometryRevision] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selection, setSelection] = useState<SelectionState>(createEmptySelection())
  const [sourceFileHandle, setSourceFileHandle] = useState<BrowserFileHandle | null>(null)
  const [sourceFileName, setSourceFileName] = useState<string | null>(null)
  const modelLoaderRef = useRef<ModelLoaderHandle>(null)

  useEffect(() => {
    setSelection(createEmptySelection())
    setGeometryRevision(0)
  }, [model, modelKey])

  useEffect(() => {
    if (model) clearMeshTopologyCaches(model)
  }, [model, geometryRevision])

  const handleModelLoad = (
    geometry: BufferGeometry,
    loadedFromHandle?: BrowserFileHandle | null,
    loadedFileName?: string,
  ) => {
    setModel(geometry)
    setLoadError(null)
    setSourceFileHandle(loadedFromHandle ?? null)
    setSourceFileName(loadedFileName ?? null)
  }

  const handleApplyTwoFaceStretch = useCallback(
    (
      targetMm: number,
    ): { ok: true; geometry: BufferGeometry } | { ok: false; error: TwoFaceStretchError } => {
      if (!model) {
        return { ok: false, error: 'invalidGeometry' }
      }
      const { faces } = selection
      if (faces.length === 0) {
        return { ok: false, error: 'invalidGeometry' }
      }
      const result = applyTwoFaceStretch(model, faces, targetMm)
      if (result.ok) {
        if (result.geometry !== model) {
          setModel(result.geometry)
        }
        setGeometryRevision((n) => n + 1)
      }
      return result
    },
    [model, selection],
  )

  const handleLoadModelClick = () => {
    setModel(null)
    setLoadError(null)
    setSourceFileHandle(null)
    setSourceFileName(null)
    setModelKey((k) => k + 1)
    modelLoaderRef.current?.openFileDialog()
  }

  const handleSaveModelClick = useCallback(() => {
    if (!model) return
    if (!sourceFileHandle) {
      void saveGeometryAsStlFileAs(model, sourceFileName ?? 'edited-model').then(setSourceFileHandle).catch(() => {})
      return
    }
    void saveGeometryAsStlFile(model, sourceFileHandle).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Save failed:', message)
    })
  }, [model, sourceFileHandle, sourceFileName])

  const handleSaveAsModelClick = useCallback(() => {
    if (!model) return
    void saveGeometryAsStlFileAs(model, sourceFileName ?? 'edited-model', sourceFileHandle ?? undefined)
      .then((handle) => {
        setSourceFileHandle(handle)
        setSourceFileName(handle.name ?? sourceFileName ?? 'edited-model.stl')
      })
      .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Save failed:', message)
    })
  }, [model, sourceFileHandle, sourceFileName])

  return (
    <div className={styles.app}>
      <Toolbar
        onLoadModelClick={handleLoadModelClick}
        onSaveModelClick={handleSaveModelClick}
        onSaveAsModelClick={handleSaveAsModelClick}
        hasModel={!!model}
      />
      <div className={styles.main}>
        <LeftPanel
          modelLoaderRef={modelLoaderRef}
          onModelLoad={handleModelLoad}
          onLoadError={setLoadError}
          loadError={loadError}
          hasModel={!!model}
        />
        <div className={styles.viewport}>
          <Viewer3D
            key={modelKey}
            model={model}
            geometryRevision={geometryRevision}
            selection={selection}
            onSelectionChange={setSelection}
            selectionProximityFilter={DEFAULT_MODEL_SELECTION_PROXIMITY_FILTER}
          />
        </div>
        <RightPanel
          selection={selection}
          model={model}
          geometryRevision={geometryRevision}
          onApplyTwoFaceStretch={handleApplyTwoFaceStretch}
        />
      </div>
    </div>
  )
}

export default App
