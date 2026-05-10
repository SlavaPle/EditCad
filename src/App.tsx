import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BufferGeometry } from 'three'
import { Toolbar } from './components/Toolbar'
import { Viewer3D } from './components/Viewer3D'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import type { ModelLoaderHandle } from './components/ModelLoader'
import { clearMeshTopologyCaches } from './features/model-selection/facePlaneSelection'
import { DEFAULT_MODEL_SELECTION_PROXIMITY_FILTER } from './features/model-selection/types'
import {
  createEmptySelection,
  selectionSupportsTwoFaceStretchProximity,
  type SelectionState,
} from './lib/selection'
import {
  ECDPRT_EXTENSION,
  saveGeometryAsEcdprtFile,
  saveGeometryWithFormatAs,
  type BrowserFileHandle,
  type SaveFormat,
} from './lib/saveModel'
import { applyTwoFaceStretch, type TwoFaceStretchError } from './lib/twoFaceStretch'
import type { PreparedElementConstraints, PreparedModelElement } from './lib/preparedElementFormat'
import {
  validatePreparedStretchPrecheck,
  type PreparedStretchPrecheckError,
} from './lib/preparedStretchValidation'
import type { FaceConstraint } from './features/face-constraints/model'
import { clampStretchTargetMmForBasicConstraints } from './features/part-constraints/clampStretchTargetForBasicConstraints'
import type { ApplyTwoFaceStretchOverlay } from './lib/applyStretchOverlay'
import styles from './App.module.css'

function getFileExtensionLower(name: string | null): string | null {
  if (!name) return null
  const i = name.lastIndexOf('.')
  if (i < 0) return null
  return name.slice(i).toLowerCase()
}

function detectFormatByFileName(name: string | null): SaveFormat | null {
  const ext = getFileExtensionLower(name)
  if (ext === '.stl') return 'stl'
  if (ext === ECDPRT_EXTENSION) return 'ecdprt'
  return null
}

function stripExtension(name: string | null): string {
  if (!name) return 'edited-model'
  const i = name.lastIndexOf('.')
  if (i < 0) return name
  return name.slice(0, i)
}

function App() {
  const [model, setModel] = useState<BufferGeometry | null>(null)
  const [modelKey, setModelKey] = useState(0)
  const [geometryRevision, setGeometryRevision] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selection, setSelection] = useState<SelectionState>(createEmptySelection())
  const [probableFaces, setProbableFaces] = useState<readonly number[]>([])
  const [sourceFileHandle, setSourceFileHandle] = useState<BrowserFileHandle | null>(null)
  const [sourceFileName, setSourceFileName] = useState<string | null>(null)
  const [sourceFormat, setSourceFormat] = useState<SaveFormat | null>(null)
  const [preparedName, setPreparedName] = useState<string>('edited-model')
  const [preparedConstraints, setPreparedConstraints] = useState<PreparedElementConstraints>({
    mode: 'fixed',
    faceConstraints: [],
    modelElements: [],
  })
  const [constraintsLocked, setConstraintsLocked] = useState(true)
  const [limitsInstallActive, setLimitsInstallActive] = useState(false)
  const modelLoaderRef = useRef<ModelLoaderHandle>(null)

  const clearAllSelection = useCallback(() => {
    setSelection(createEmptySelection())
    setProbableFaces([])
  }, [])

  useEffect(() => {
    setSelection(createEmptySelection())
    setProbableFaces([])
    setGeometryRevision(0)
  }, [model, modelKey])

  useEffect(() => {
    if (model) clearMeshTopologyCaches(model)
  }, [model, geometryRevision])

  const handleModelLoad = (
    geometry: BufferGeometry,
    loadedFromHandle?: BrowserFileHandle | null,
    loadedFileName?: string,
    loadedFormat?: SaveFormat,
    loadedPrepared?: { name: string; constraints: PreparedElementConstraints },
  ) => {
    setModel(geometry)
    setLoadError(null)
    setSourceFileHandle(loadedFromHandle ?? null)
    setSourceFileName(loadedFileName ?? null)
    setSourceFormat(loadedFormat ?? detectFormatByFileName(loadedFileName ?? null))
    setPreparedName(loadedPrepared?.name ?? stripExtension(loadedFileName ?? null))
    setPreparedConstraints(
      loadedPrepared?.constraints ?? { mode: 'fixed', faceConstraints: [], modelElements: [] },
    )
  }

  const handleMergeModelElements = useCallback((newElements: readonly PreparedModelElement[]) => {
    setPreparedConstraints((prev) => {
      const existing = [...(prev.modelElements ?? [])]
      const ids = new Set(existing.map((e) => e.id))
      for (const el of newElements) {
        if (ids.has(el.id)) continue
        ids.add(el.id)
        existing.push({ ...el, faceIndices: [...el.faceIndices] })
      }
      return { ...prev, modelElements: existing } as PreparedElementConstraints
    })
  }, [])

  const stretchSelectionForLimitsUi = useMemo(
    () => selectionSupportsTwoFaceStretchProximity(selection, probableFaces),
    [selection, probableFaces],
  )

  useEffect(() => {
    if (!stretchSelectionForLimitsUi && limitsInstallActive) {
      setLimitsInstallActive(false)
    }
  }, [stretchSelectionForLimitsUi, limitsInstallActive])

  const preparedFaceConstraints = preparedConstraints.faceConstraints ?? []

  const handleFaceConstraintsChange = useCallback((next: FaceConstraint[]) => {
    setPreparedConstraints((prev) => ({ ...prev, faceConstraints: next }) as PreparedElementConstraints)
  }, [])

  const handleApplyTwoFaceStretch = useCallback(
    (
      targetMm: number,
      overlay?: ApplyTwoFaceStretchOverlay,
    ):
      | { ok: true; geometry: BufferGeometry; effectiveTargetMm: number }
      | { ok: false; error: TwoFaceStretchError | PreparedStretchPrecheckError } => {
      if (!model) {
        return { ok: false, error: 'invalidGeometry' }
      }
      const faces = selection.faces
      let mergedFaces: number[]
      if (overlay?.mergedFaces?.length) {
        mergedFaces = [...overlay.mergedFaces]
      } else {
        mergedFaces = [...faces]
        const seen = new Set(faces)
        for (const fi of probableFaces) {
          if (seen.has(fi)) continue
          mergedFaces.push(fi)
          seen.add(fi)
        }
      }
      if (mergedFaces.length === 0) {
        return { ok: false, error: 'invalidGeometry' }
      }

      const faceConstraintsEffective =
        overlay?.faceConstraints ?? preparedConstraints.faceConstraints ?? []
      const modelElementsEffective = overlay?.modelElements ?? preparedConstraints.modelElements ?? []

      const preparedEffective: PreparedElementConstraints = {
        ...preparedConstraints,
        faceConstraints: [...faceConstraintsEffective],
        modelElements: [...modelElementsEffective],
      }

      const constraintsEvalLocked = constraintsLocked || overlay?.forceConstraintEvaluation === true

      const { targetMm: resolvedTargetMm } = clampStretchTargetMmForBasicConstraints({
        geometry: model,
        mergedFaces,
        rawTargetMm: targetMm,
        faceConstraints: faceConstraintsEffective,
        modelElements: modelElementsEffective,
        constraintsLocked: constraintsEvalLocked,
      })

      const pre = validatePreparedStretchPrecheck({
        model,
        mergedFaces,
        targetMm: resolvedTargetMm,
        prepared: preparedEffective,
        constraintsLocked: constraintsEvalLocked,
      })
      if (!pre.ok) {
        return { ok: false, error: pre.error }
      }
      const result = applyTwoFaceStretch(model, mergedFaces, resolvedTargetMm)
      if (result.ok) {
        if (result.geometry !== model) {
          setModel(result.geometry)
        }
        setGeometryRevision((n) => n + 1)
        return {
          ok: true,
          geometry: result.geometry,
          effectiveTargetMm: resolvedTargetMm,
        }
      }
      return { ok: false, error: result.error }
    },
    [model, selection, probableFaces, preparedConstraints, constraintsLocked],
  )

  const handleLoadModelClick = () => {
    setModel(null)
    setLoadError(null)
    setSourceFileHandle(null)
    setSourceFileName(null)
    setSourceFormat(null)
    setModelKey((k) => k + 1)
    modelLoaderRef.current?.openFileDialog()
  }

  const handleSaveModelClick = useCallback(() => {
    if (!model) return
    const baseName = preparedName || stripExtension(sourceFileName ?? 'edited-model')
    const canOverwriteEcdprt = sourceFormat === 'ecdprt' && !!sourceFileHandle
    if (canOverwriteEcdprt) {
      void saveGeometryAsEcdprtFile(model, sourceFileHandle, preparedName, preparedConstraints).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Save failed:', message)
      })
      return
    }
    void saveGeometryWithFormatAs(model, baseName, sourceFileHandle ?? undefined, preparedConstraints)
      .then(({ handle, format, fileName }) => {
        setSourceFileHandle(handle)
        setSourceFileName(fileName)
        setSourceFormat(format)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Save failed:', message)
      })
  }, [model, preparedConstraints, preparedName, sourceFileHandle, sourceFileName, sourceFormat])

  const handleSaveAsModelClick = useCallback(() => {
    if (!model) return
    const baseName = preparedName || stripExtension(sourceFileName ?? 'edited-model')
    void saveGeometryWithFormatAs(model, baseName, sourceFileHandle ?? undefined, preparedConstraints)
      .then(({ handle, format, fileName }) => {
        setSourceFileHandle(handle)
        setSourceFileName(fileName)
        setSourceFormat(format)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Save failed:', message)
      })
  }, [model, preparedConstraints, preparedName, sourceFileHandle, sourceFileName])

  return (
    <div className={styles.app}>
      <Toolbar
        onLoadModelClick={handleLoadModelClick}
        onSaveModelClick={handleSaveModelClick}
        onSaveAsModelClick={handleSaveAsModelClick}
        hasModel={!!model}
        limitsInstallActive={limitsInstallActive}
        limitsPlacementAllowed={stretchSelectionForLimitsUi}
        onToggleLimitsInstall={() => setLimitsInstallActive((v) => !v)}
      />
      <div className={styles.main}>
        <LeftPanel
          modelLoaderRef={modelLoaderRef}
          onModelLoad={handleModelLoad}
          onLoadError={setLoadError}
          loadError={loadError}
          hasModel={!!model}
          currentFileName={sourceFileName}
          currentFileFormat={sourceFormat}
          faceConstraints={preparedFaceConstraints}
          constraintsLocked={constraintsLocked}
          onConstraintsLockedChange={setConstraintsLocked}
        />
        <div className={styles.viewport}>
          <Viewer3D
            key={modelKey}
            model={model}
            geometryRevision={geometryRevision}
            selection={selection}
            onSelectionChange={setSelection}
            selectionProximityFilter={DEFAULT_MODEL_SELECTION_PROXIMITY_FILTER}
            onProbableFacesChange={setProbableFaces}
            onClearSelection={clearAllSelection}
          />
        </div>
        <RightPanel
          selection={selection}
          probableFaces={probableFaces}
          model={model}
          geometryRevision={geometryRevision}
          constraintsLocked={constraintsLocked}
          limitsInstallActive={limitsInstallActive}
          preparedModelElements={preparedConstraints.modelElements ?? []}
          onApplyTwoFaceStretch={handleApplyTwoFaceStretch}
          faceConstraints={preparedFaceConstraints}
          onFaceConstraintsChange={handleFaceConstraintsChange}
          onMergeModelElements={handleMergeModelElements}
        />
      </div>
    </div>
  )
}

export default App
