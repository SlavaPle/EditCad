import { useCallback, useEffect, useRef, useState } from 'react'
import type { BufferGeometry } from 'three'
import { Toolbar } from './components/Toolbar'
import {
  DEFAULT_TOOLBAR_TAB_ID,
  type ToolbarTabId,
} from './components/ToolbarTabsConfig'
import { Viewer3D } from './components/Viewer3D'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import type { ModelLoaderHandle } from './components/ModelLoader'
import { clearMeshTopologyCaches } from './features/model-selection/facePlaneSelection'
import {
  rotateGeometryAroundCenter,
  type RotationDegrees,
} from './features/model-transform/rotateGeometryAroundCenter'
import { DEFAULT_MODEL_SELECTION_PROXIMITY_FILTER } from './features/model-selection/types'
import {
  DEFAULT_MODEL_DISPLAY_MODE,
  type ModelDisplayMode,
} from './features/viewer-display/modelDisplayMode'
import {
  DEFAULT_MODEL_APPEARANCE,
  type ModelAppearance,
} from './features/viewer-display/modelAppearance'
import { createEmptySelection, selectFaces, type SelectionState } from './lib/selection'
import {
  ECDPRT_EXTENSION,
  saveGeometryAsEcdprtFile,
  saveGeometryWithFormatAs,
  type BrowserFileHandle,
  type SaveFormat,
} from './lib/saveModel'
import type { TwoFaceStretchError } from './lib/twoFaceStretch'
import type { PreparedElementConstraints, PreparedModelElement } from './lib/preparedElementFormat'
import type { PreparedStretchPrecheckError } from './lib/preparedStretchValidation'
import { applyTwoFaceStretchWithConstraints } from './lib/applyTwoFaceStretchWithConstraints'
import type { FaceConstraint, FaceConstraintType } from './features/face-constraints/model'
import { removeBlockAndAuxiliaryConstraints } from './features/face-constraints/blockInstallBundle'
import { syncPanelAuxiliaryConstraints } from './features/face-constraints/syncPanelAuxiliaryConstraints'
import { removePanelAndAuxiliaryConstraints } from './features/face-constraints/panelInstallBundle'
import { removeProfilAndAuxiliaryConstraints } from './features/face-constraints/profilInstallBundle'
import { removeFaceConstraint, replaceFaceConstraintById } from './features/face-constraints/store'
import { collectDimensionOccupancy } from './features/face-constraints/limitDimensionSlots'
import { resizeGeometryAfterConstraintMmEdit } from './features/part-constraints/resizeGeometryAfterConstraintMmEdit'
import { resolveConstraintDependentFaceIndices } from './features/part-constraints/resolveConstraintDependentFaces'
import type { ApplyTwoFaceStretchOverlay } from './lib/applyStretchOverlay'
import styles from './App.module.css'
import {
  appendProgramParts,
  AssemblyLoader,
  createAssemblyFileFromProgram,
  createEmptyPhantomFile,
  getPreAssemblyToolbarUi,
  preAssemblySelectionAnchorId,
  preAssemblySelectionElementId,
  phantomDocFromAssemblyFile,
  programPartsFromAssemblyProgram,
  ProgramPartFilePicker,
  removeProgramPart,
  saveAssemblyFileAs,
  saveAssemblyToHandle,
  savePhantomAssemblyFileAs,
  savePhantomAssemblyToHandle,
  stripEcdasmExtension,
  stripEcdpreExtension,
  PhantomLoader,
  type AssemblyFile,
  type AssemblyLoaderHandle,
  type PhantomAssemblyFile,
  type PhantomLoaderHandle,
  type PreAssemblyPanelSelection,
  type PreAssemblyProgramPart,
  type PreAssemblyWizard,
  type ProgramPartFilePickerHandle,
  type ProgramPartPickEntry,
} from './features/pre-assembly'

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
  const [focusedLimitConstraintId, setFocusedLimitConstraintId] = useState<string | null>(null)
  const [limitsInstallActive, setLimitsInstallActive] = useState(false)
  const [appearanceEditActive, setAppearanceEditActive] = useState(false)
  const [displayMode, setDisplayMode] = useState<ModelDisplayMode>(DEFAULT_MODEL_DISPLAY_MODE)
  const [modelAppearance, setModelAppearance] = useState<ModelAppearance>(DEFAULT_MODEL_APPEARANCE)
  const [limitsInstallConstraintType, setLimitsInstallConstraintType] = useState<FaceConstraintType>('minmax')
  const [phantomDoc, setPhantomDoc] = useState<PhantomAssemblyFile | null>(null)
  const [phantomSourceFileHandle, setPhantomSourceFileHandle] = useState<BrowserFileHandle | null>(null)
  const [phantomSourceFileName, setPhantomSourceFileName] = useState<string | null>(null)
  const [phantomLoadError, setPhantomLoadError] = useState<string | null>(null)
  const [activeToolbarTab, setActiveToolbarTab] = useState<ToolbarTabId>(DEFAULT_TOOLBAR_TAB_ID)
  const [programParts, setProgramParts] = useState<PreAssemblyProgramPart[]>([])
  const [programPartGeometries, setProgramPartGeometries] = useState<
    Record<string, BufferGeometry>
  >({})
  const [programPartsFitToken, setProgramPartsFitToken] = useState(0)
  const [assemblySourceFileHandle, setAssemblySourceFileHandle] = useState<BrowserFileHandle | null>(null)
  const [assemblySourceFileName, setAssemblySourceFileName] = useState<string | null>(null)
  const [assemblyDocMeta, setAssemblyDocMeta] = useState<{ id: string; name: string }>({
    id: 'assembly-root',
    name: 'Assembly',
  })
  const [programLoadError, setProgramLoadError] = useState<string | null>(null)
  const [preAssemblyWizard, setPreAssemblyWizard] = useState<PreAssemblyWizard>(null)
  const [preAssemblySelection, setPreAssemblySelection] =
    useState<PreAssemblyPanelSelection>(null)
  const modelLoaderRef = useRef<ModelLoaderHandle>(null)
  const phantomLoaderRef = useRef<PhantomLoaderHandle>(null)
  const assemblyLoaderRef = useRef<AssemblyLoaderHandle>(null)
  const programPartPickerRef = useRef<ProgramPartFilePickerHandle>(null)

  const preAssemblyActive = activeToolbarTab === 'preAssembly'

  const selectedPhantomAnchorId = preAssemblySelectionAnchorId(preAssemblySelection)
  const selectedPhantomElementId = preAssemblySelectionElementId(preAssemblySelection)

  const clearAllSelection = useCallback(() => {
    setSelection(createEmptySelection())
    setProbableFaces([])
    setLimitsInstallActive(false)
    setAppearanceEditActive(false)
  }, [])

  const handleRestoreFaceSelection = useCallback((faceTriangleIndices: readonly number[]) => {
    setProbableFaces([])
    setSelection(selectFaces(createEmptySelection(), faceTriangleIndices, 'replace'))
  }, [])

  const handleLimitRowClick = useCallback(
    (c: FaceConstraint) => {
      if (!constraintsLocked) {
        setFocusedLimitConstraintId(c.id)
      }
      if (!model) return
      const faces = resolveConstraintDependentFaceIndices({
        constraint: c,
        geometry: model,
        modelElements: preparedConstraints.modelElements ?? [],
      })
      setProbableFaces([])
      if (faces.length === 0) {
        clearAllSelection()
        return
      }
      setSelection(selectFaces(createEmptySelection(), faces, 'replace'))
    },
    [constraintsLocked, model, preparedConstraints.modelElements, clearAllSelection],
  )

  useEffect(() => {
    setSelection(createEmptySelection())
    setProbableFaces([])
    setGeometryRevision(0)
  }, [model, modelKey])

  useEffect(() => {
    if (model) clearMeshTopologyCaches(model)
  }, [model, geometryRevision])

  useEffect(() => {
    if (constraintsLocked) setFocusedLimitConstraintId(null)
  }, [constraintsLocked])

  useEffect(() => {
    if (!limitsInstallActive) {
      setLimitsInstallConstraintType('minmax')
    }
  }, [limitsInstallActive])

  const handleModelLoad = (
    geometry: BufferGeometry,
    loadedFromHandle?: BrowserFileHandle | null,
    loadedFileName?: string,
    loadedFormat?: SaveFormat,
    loadedPrepared?: {
      name: string
      constraints: PreparedElementConstraints
      appearance?: ModelAppearance
    },
  ) => {
    setModel(geometry)
    setModelKey((k) => k + 1)
    setLoadError(null)
    setSourceFileHandle(loadedFromHandle ?? null)
    setSourceFileName(loadedFileName ?? null)
    setSourceFormat(loadedFormat ?? detectFormatByFileName(loadedFileName ?? null))
    setPreparedName(loadedPrepared?.name ?? stripExtension(loadedFileName ?? null))
    setPreparedConstraints(
      loadedPrepared?.constraints ?? { mode: 'fixed', faceConstraints: [], modelElements: [] },
    )
    setModelAppearance(loadedPrepared?.appearance ?? DEFAULT_MODEL_APPEARANCE)
    if (loadedPrepared?.appearance?.surface === 'texture') {
      setDisplayMode('solidTextured')
    }
    setFocusedLimitConstraintId(null)
  }

  const handleAppearanceChange = useCallback((next: ModelAppearance) => {
    setModelAppearance(next)
    if (next.surface === 'texture') {
      setDisplayMode((mode) => (mode === 'edgesOnly' ? mode : 'solidTextured'))
    }
  }, [])

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

  const preparedFaceConstraints = preparedConstraints.faceConstraints ?? []

  useEffect(() => {
    if (preparedFaceConstraints.some((c) => c.type === 'block')) {
      setConstraintsLocked(true)
    }
  }, [preparedFaceConstraints])

  const limitsAddDisabled = (() => {
    if (!model) return false
    if (preparedFaceConstraints.length >= 3) return true
    const occ = collectDimensionOccupancy(
      model,
      preparedConstraints.modelElements ?? [],
      preparedFaceConstraints,
    )
    if (occ.hasFull) return true
    return occ.occupied.size >= 3
  })()

  useEffect(() => {
    if (!limitsInstallActive) return
    if (!limitsAddDisabled) return
    setLimitsInstallActive(false)
  }, [limitsAddDisabled, limitsInstallActive])

  useEffect(() => {
    if (focusedLimitConstraintId === null) return
    if (!preparedFaceConstraints.some((x) => x.id === focusedLimitConstraintId)) {
      setFocusedLimitConstraintId(null)
    }
  }, [preparedFaceConstraints, focusedLimitConstraintId])

  const handleFaceConstraintsChange = useCallback((next: FaceConstraint[]) => {
    setPreparedConstraints((prev) => ({ ...prev, faceConstraints: next }) as PreparedElementConstraints)
  }, [])

  const handleReplaceLimitConstraint = useCallback(
    (next: FaceConstraint) => {
      let newList =
        next.type === 'panel'
          ? syncPanelAuxiliaryConstraints(preparedFaceConstraints, next)
          : replaceFaceConstraintById(preparedFaceConstraints, next)
      if (next.type === 'profil' && next.stretchMinMaxId) {
        const linked = newList.find((c) => c.id === next.stretchMinMaxId)
        if (linked?.type === 'minmax') {
          newList = replaceFaceConstraintById(newList, {
            ...linked,
            maxMm: next.valueMm,
            minMm: next.stretchMinMm ?? 0,
          })
        }
      }
      handleFaceConstraintsChange(newList)
      if (!model) return
      const preparedNext: PreparedElementConstraints = {
        ...preparedConstraints,
        faceConstraints: newList,
      } as PreparedElementConstraints
      const resize = resizeGeometryAfterConstraintMmEdit({
        geometry: model,
        editedConstraint: next,
        allConstraints: newList,
        prepared: preparedNext,
      })
      if (!resize.gapAdjusted) return
      clearAllSelection()
      setModel(resize.geometry)
      setGeometryRevision((n) => n + 1)
    },
    [
      handleFaceConstraintsChange,
      preparedFaceConstraints,
      preparedConstraints,
      model,
      clearAllSelection,
    ],
  )

  const handleRemoveLimitConstraint = useCallback(
    (id: string) => {
      const target = preparedFaceConstraints.find((c) => c.id === id)
      let newList = preparedFaceConstraints
      if (target?.type === 'panel') {
        newList = removePanelAndAuxiliaryConstraints(preparedFaceConstraints, id)
      } else if (target?.type === 'profil') {
        newList = removeProfilAndAuxiliaryConstraints(preparedFaceConstraints, id)
      } else if (target?.type === 'block') {
        newList = removeBlockAndAuxiliaryConstraints(preparedFaceConstraints, id)
      } else {
        newList = removeFaceConstraint(preparedFaceConstraints, id)
      }
      handleFaceConstraintsChange(newList)
      setFocusedLimitConstraintId((cur) => (cur === id ? null : cur))
    },
    [handleFaceConstraintsChange, preparedFaceConstraints],
  )

  const handleApplyModelRotation = useCallback(
    (rotationDeg: RotationDegrees) => {
      if (!model) return
      rotateGeometryAroundCenter(model, rotationDeg)
      clearMeshTopologyCaches(model)
      setGeometryRevision((n) => n + 1)
    },
    [model],
  )

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

      const result = applyTwoFaceStretchWithConstraints({
        geometry: model,
        targetMm,
        mergedFaces,
        prepared: preparedConstraints,
        constraintsLocked,
        overlay,
      })
      if (result.ok) {
        if (result.geometry !== model) {
          setModel(result.geometry)
        }
        setGeometryRevision((n) => n + 1)
      }
      return result
    },
    [model, selection, probableFaces, preparedConstraints, constraintsLocked],
  )

  const handleLoadModelClick = () => {
    setLoadError(null)
    modelLoaderRef.current?.openFileDialog()
  }

  const handleSaveModelClick = useCallback(() => {
    if (!model) return
    const baseName = preparedName || stripExtension(sourceFileName ?? 'edited-model')
    const canOverwriteEcdprt = sourceFormat === 'ecdprt' && !!sourceFileHandle
    if (canOverwriteEcdprt) {
      void saveGeometryAsEcdprtFile(model, sourceFileHandle, preparedName, preparedConstraints, modelAppearance).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Save failed:', message)
      })
      return
    }
    void saveGeometryWithFormatAs(model, baseName, sourceFileHandle ?? undefined, preparedConstraints, modelAppearance)
      .then(({ handle, format, fileName }) => {
        setSourceFileHandle(handle)
        setSourceFileName(fileName)
        setSourceFormat(format)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Save failed:', message)
      })
  }, [model, preparedConstraints, preparedName, sourceFileHandle, sourceFileName, sourceFormat, modelAppearance])

  const handleSaveAsModelClick = useCallback(() => {
    if (!model) return
    const baseName = preparedName || stripExtension(sourceFileName ?? 'edited-model')
    void saveGeometryWithFormatAs(model, baseName, sourceFileHandle ?? undefined, preparedConstraints, modelAppearance)
      .then(({ handle, format, fileName }) => {
        setSourceFileHandle(handle)
        setSourceFileName(fileName)
        setSourceFormat(format)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Save failed:', message)
      })
  }, [model, preparedConstraints, preparedName, sourceFileHandle, sourceFileName, modelAppearance])

  const preAssemblyToolbarUi = getPreAssemblyToolbarUi({
    phantomDoc,
    programPartCount: programParts.length,
  })

  const handlePhantomLoad = useCallback(
    (
      file: PhantomAssemblyFile,
      sourceHandle?: BrowserFileHandle | null,
      fileName?: string,
    ) => {
      setPhantomDoc(file)
      setPhantomSourceFileHandle(sourceHandle ?? null)
      setPhantomSourceFileName(fileName ?? null)
      setPhantomLoadError(null)
      setPreAssemblyWizard(null)
      setPreAssemblySelection({ kind: 'envelope' })
      setLimitsInstallActive(false)
      setAppearanceEditActive(false)
    },
    [],
  )

  const handleLoadPhantomClick = useCallback(() => {
    setPhantomLoadError(null)
    void phantomLoaderRef.current?.openFileDialog()
  }, [])

  const handleSavePhantomClick = useCallback(() => {
    if (!phantomDoc || preAssemblyToolbarUi.saveDisabled) return
    const baseName = phantomDoc.name || stripEcdpreExtension(phantomSourceFileName)
    const canOverwrite =
      !!phantomSourceFileHandle &&
      (phantomSourceFileName?.toLowerCase().endsWith('.ecdpre') ?? false)
    if (canOverwrite) {
      void savePhantomAssemblyToHandle(phantomDoc, phantomSourceFileHandle)
        .then((savedName) => {
          if (savedName) setPhantomSourceFileName(savedName)
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          console.error('Phantom save failed:', message)
        })
      return
    }
    void savePhantomAssemblyFileAs(phantomDoc, baseName, phantomSourceFileHandle ?? undefined)
      .then(({ handle, fileName }) => {
        setPhantomSourceFileHandle(handle)
        setPhantomSourceFileName(fileName)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Phantom save failed:', message)
      })
  }, [phantomDoc, phantomSourceFileHandle, phantomSourceFileName, preAssemblyToolbarUi.saveDisabled])

  const handleSavePhantomAsClick = useCallback(() => {
    if (!phantomDoc || preAssemblyToolbarUi.saveDisabled) return
    const baseName = phantomDoc.name || stripEcdpreExtension(phantomSourceFileName)
    void savePhantomAssemblyFileAs(phantomDoc, baseName, phantomSourceFileHandle ?? undefined)
      .then(({ handle, fileName }) => {
        setPhantomSourceFileHandle(handle)
        setPhantomSourceFileName(fileName)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Phantom save failed:', message)
      })
  }, [phantomDoc, phantomSourceFileHandle, phantomSourceFileName, preAssemblyToolbarUi.saveDisabled])

  const handleCreatePhantom = useCallback(() => {
    setPhantomDoc(createEmptyPhantomFile())
    setPhantomSourceFileHandle(null)
    setPhantomSourceFileName(null)
    setPhantomLoadError(null)
    setPreAssemblyWizard(null)
    setPreAssemblySelection({ kind: 'envelope' })
    setLimitsInstallActive(false)
    setAppearanceEditActive(false)
  }, [])

  const handleAddPart = useCallback(() => {
    setProgramLoadError(null)
    void programPartPickerRef.current?.openFileDialog()
    setLimitsInstallActive(false)
    setAppearanceEditActive(false)
  }, [])

  const disposeProgramPartGeometries = useCallback((geometries: Record<string, BufferGeometry>) => {
    for (const geometry of Object.values(geometries)) {
      geometry.dispose()
    }
  }, [])

  const handleProgramPartsPicked = useCallback((entries: ProgramPartPickEntry[]) => {
    if (entries.length === 0) return
    setProgramParts((current) => {
      const descriptors = entries.map((entry) => entry.part)
      const nextParts = appendProgramParts(current, descriptors)
      const added = nextParts.slice(current.length)
      setProgramPartGeometries((geometries) => {
        const next = { ...geometries }
        for (let i = 0; i < added.length; i++) {
          next[added[i].id] = entries[i].geometry
        }
        return next
      })
      return nextParts
    })
    setProgramPartsFitToken((token) => token + 1)
    setProgramLoadError(null)
    setActiveToolbarTab('preAssembly')
  }, [])

  const handleProgramPartPickError = useCallback((message: string) => {
    setProgramLoadError(message)
  }, [])

  const handleRemoveProgramPart = useCallback((partId: string) => {
    setProgramParts((current) => removeProgramPart(current, partId))
    setProgramPartGeometries((geometries) => {
      const next = { ...geometries }
      const geometry = next[partId]
      if (geometry) {
        geometry.dispose()
        delete next[partId]
      }
      return next
    })
    setProgramPartsFitToken((token) => token + 1)
  }, [])

  const handleAssemblyLoad = useCallback(
    (
      file: AssemblyFile,
      sourceHandle?: BrowserFileHandle | null,
      fileName?: string,
    ) => {
      setProgramPartGeometries((geometries) => {
        disposeProgramPartGeometries(geometries)
        return {}
      })
      setProgramParts(programPartsFromAssemblyProgram(file.program))
      setProgramPartsFitToken((token) => token + 1)
      const embeddedPhantom = phantomDocFromAssemblyFile(file)
      setPhantomDoc(embeddedPhantom)
      setPhantomSourceFileHandle(null)
      setPhantomSourceFileName(null)
      setPhantomLoadError(null)
      setAssemblySourceFileHandle(sourceHandle ?? null)
      setAssemblySourceFileName(fileName ?? null)
      setAssemblyDocMeta({ id: file.id, name: file.name })
      setProgramLoadError(null)
      setActiveToolbarTab('preAssembly')
    },
    [disposeProgramPartGeometries],
  )

  const handleLoadAssemblyClick = useCallback(() => {
    setProgramLoadError(null)
    void assemblyLoaderRef.current?.openFileDialog()
  }, [])

  const buildAssemblyFile = useCallback(() => {
    return createAssemblyFileFromProgram(programParts, {
      id: assemblyDocMeta.id,
      name: assemblyDocMeta.name,
      phantomDoc,
    })
  }, [assemblyDocMeta, phantomDoc, programParts])

  const handleSaveAssemblyAsClick = useCallback(() => {
    if (programParts.length === 0 && !phantomDoc) return
    const baseName = assemblyDocMeta.name || stripEcdasmExtension(assemblySourceFileName)
    void saveAssemblyFileAs(buildAssemblyFile(), baseName, assemblySourceFileHandle ?? undefined)
      .then(({ handle, fileName }) => {
        setAssemblySourceFileHandle(handle)
        setAssemblySourceFileName(fileName)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        setProgramLoadError(message)
      })
  }, [
    assemblyDocMeta,
    assemblySourceFileHandle,
    assemblySourceFileName,
    buildAssemblyFile,
    phantomDoc,
    programParts.length,
  ])

  const handleSaveAssemblyClick = useCallback(() => {
    if (programParts.length === 0 && !phantomDoc) return
    const assemblyFile = buildAssemblyFile()
    const canOverwrite =
      !!assemblySourceFileHandle &&
      (assemblySourceFileName?.toLowerCase().endsWith('.ecdasm') ?? false)
    if (canOverwrite) {
      void saveAssemblyToHandle(assemblyFile, assemblySourceFileHandle)
        .then((savedName) => {
          if (savedName) setAssemblySourceFileName(savedName)
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          setProgramLoadError(message)
        })
      return
    }
    handleSaveAssemblyAsClick()
  }, [
    assemblyDocMeta,
    assemblySourceFileHandle,
    assemblySourceFileName,
    buildAssemblyFile,
    handleSaveAssemblyAsClick,
    phantomDoc,
    programParts.length,
  ])

  const handleCreateAttachment = useCallback(() => {
    if (preAssemblyToolbarUi.createAttachmentDisabled) return
    setPreAssemblyWizard((current) => {
      const next = current === 'attachment' ? null : 'attachment'
      if (next !== null) {
        setLimitsInstallActive(false)
        setAppearanceEditActive(false)
      }
      return next
    })
  }, [preAssemblyToolbarUi.createAttachmentDisabled])

  return (
    <div className={styles.app}>
      <Toolbar
        activeToolbarTab={activeToolbarTab}
        onActiveToolbarTabChange={setActiveToolbarTab}
        onLoadModelClick={handleLoadModelClick}
        onSaveModelClick={handleSaveModelClick}
        onSaveAsModelClick={handleSaveAsModelClick}
        hasModel={!!model}
        limitsInstallActive={limitsInstallActive}
        limitsAddDisabled={limitsAddDisabled}
        onToggleLimitsInstall={() => {
          setLimitsInstallActive((v) => {
            const next = !v
            if (next) {
              setAppearanceEditActive(false)
              setPreAssemblyWizard(null)
            }
            return next
          })
        }}
        appearanceEditActive={appearanceEditActive}
        onToggleAppearanceEdit={() => {
          setAppearanceEditActive((v) => {
            const next = !v
            if (next) {
              setLimitsInstallActive(false)
              setPreAssemblyWizard(null)
            }
            return next
          })
        }}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        preAssemblyToolbarUi={preAssemblyToolbarUi}
        preAssemblyWizard={preAssemblyWizard}
        onLoadAssemblyClick={handleLoadAssemblyClick}
        onSaveAssemblyClick={handleSaveAssemblyClick}
        onSaveAssemblyAsClick={handleSaveAssemblyAsClick}
        onLoadPhantomClick={handleLoadPhantomClick}
        onSavePhantomClick={handleSavePhantomClick}
        onSavePhantomAsClick={handleSavePhantomAsClick}
        onCreatePhantom={handleCreatePhantom}
        onAddPart={handleAddPart}
        onCreateAttachment={handleCreateAttachment}
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
          limitsSummaryGeometry={model}
          limitsSummaryModelElements={preparedConstraints.modelElements ?? []}
          geometryRevision={geometryRevision}
          onApplyTwoFaceStretch={handleApplyTwoFaceStretch}
          onLimitRowClick={handleLimitRowClick}
          focusedLimitConstraintId={focusedLimitConstraintId}
          onReplaceLimitConstraint={handleReplaceLimitConstraint}
          onRemoveLimitConstraint={handleRemoveLimitConstraint}
          limitsInstallActive={limitsInstallActive}
          limitsInstallConstraintType={limitsInstallConstraintType}
          onLimitsInstallConstraintTypeChange={setLimitsInstallConstraintType}
          phantomDoc={phantomDoc}
          phantomSourceFileName={phantomSourceFileName}
          phantomLoadError={phantomLoadError}
          preAssemblyActive={preAssemblyActive}
          programParts={programParts}
          assemblySourceFileName={assemblySourceFileName}
          programLoadError={programLoadError}
          preAssemblySelection={preAssemblySelection}
          onPreAssemblySelectionChange={setPreAssemblySelection}
          onPhantomDocChange={setPhantomDoc}
          onAddPart={handleAddPart}
          onRemoveProgramPart={handleRemoveProgramPart}
        />
        <div className={styles.viewport}>
          <Viewer3D
            key={modelKey}
            model={model}
            modelLoadToken={modelKey}
            geometryRevision={geometryRevision}
            displayMode={displayMode}
            appearance={modelAppearance}
            selection={selection}
            onSelectionChange={setSelection}
            selectionProximityFilter={DEFAULT_MODEL_SELECTION_PROXIMITY_FILTER}
            onProbableFacesChange={setProbableFaces}
            onClearSelection={clearAllSelection}
            phantom={phantomDoc?.phantom ?? null}
            selectedPhantomAnchorId={selectedPhantomAnchorId}
            selectedPhantomElementId={selectedPhantomElementId}
            programParts={programParts}
            programPartGeometries={programPartGeometries}
            programPartsFitToken={programPartsFitToken}
          />
        </div>
        <RightPanel
          selection={selection}
          probableFaces={probableFaces}
          model={model}
          geometryRevision={geometryRevision}
          constraintsLocked={constraintsLocked}
          limitsInstallActive={limitsInstallActive}
          appearanceEditActive={appearanceEditActive}
          appearance={modelAppearance}
          onAppearanceChange={handleAppearanceChange}
          limitsInstallConstraintType={limitsInstallConstraintType}
          onLimitsInstallConstraintTypeChange={setLimitsInstallConstraintType}
          preparedModelElements={preparedConstraints.modelElements ?? []}
          onApplyTwoFaceStretch={handleApplyTwoFaceStretch}
          faceConstraints={preparedFaceConstraints}
          onFaceConstraintsChange={handleFaceConstraintsChange}
          onMergeModelElements={handleMergeModelElements}
          onRestoreFaceSelection={handleRestoreFaceSelection}
          onLimitsInstallDone={() => setLimitsInstallActive(false)}
          onApplyModelRotation={handleApplyModelRotation}
          phantomDoc={phantomDoc}
          preAssemblySelection={preAssemblySelection}
          onPreAssemblySelectionChange={setPreAssemblySelection}
          onPhantomDocChange={setPhantomDoc}
          preAssemblyWizard={preAssemblyWizard}
          onPreAssemblyWizardDone={() => setPreAssemblyWizard(null)}
        />
      </div>
      <PhantomLoader
        ref={phantomLoaderRef}
        onLoad={handlePhantomLoad}
        onError={setPhantomLoadError}
      />
      <AssemblyLoader
        ref={assemblyLoaderRef}
        onLoad={handleAssemblyLoad}
        onError={setProgramLoadError}
      />
      <ProgramPartFilePicker
        ref={programPartPickerRef}
        onPick={handleProgramPartsPicked}
        onError={handleProgramPartPickError}
      />
    </div>
  )
}

export default App
