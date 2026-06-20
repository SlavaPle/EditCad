import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { canChangeViewDisplayMode } from './features/viewer-display/viewToolbarState'
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
  assignProgramPartLayoutPositions,
  mergeProgramPartsBatch,
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
  persistAssemblyRootHandle,
  restoreAssemblyRootHandle,
  saveAssemblyFileAs,
  saveAssemblyToHandle,
  savePhantomAssemblyFileAs,
  savePhantomAssemblyToHandle,
  stripEcdasmExtension,
  stripEcdpreExtension,
  type AssemblyFile,
  type AssemblyLoaderHandle,
  type PhantomAssemblyFile,
  type PhantomTransform,
  type PreAssemblyPanelSelection,
  type PreAssemblyProgramPart,
  type PreAssemblyWizard,
  type ProgramPartFilePickerHandle,
  type ProgramPartPickEntry,
} from './features/pre-assembly'
import { layoutProgramPartPositionsMm } from './features/pre-assembly/viewer'
import { loadGeometriesFromAssembly } from './features/pre-assembly/programParts/loadAssemblyProgramPartGeometries'
import { buildProgramPartDisplayNameById } from './features/pre-assembly/programParts/programPartDisplayName'
import { isUserCancelError } from './lib/isUserCancelError'
import { MatesPopup } from './components/assembly-mates'
import {
  createMateDraftSession,
  mateDraftHasUnsavedApply,
  mateDraftRevert,
  mateDraftSave,
  mateDraftSetPlane,
  mateDraftUpdateDraft,
  executeMateApply,
  validateParallelMateDraft,
  applyAssemblyMateConstraints,
  filterAssemblyMatesForPartIds,
  reapplyAllAssemblyMates,
  type AssemblyMate,
  type MateDraftSession,
  type MatesPickMode,
  type MatesPickSlot,
  toggleMatesPickSlot,
} from './features/assembly-mates'
import i18n from './i18n'

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
  const [programPartAppearances, setProgramPartAppearances] = useState<
    Record<string, ModelAppearance>
  >({})
  const [programPartsFitToken, setProgramPartsFitToken] = useState(0)
  const [assemblyRootDirectoryHandle, setAssemblyRootDirectoryHandle] =
    useState<FileSystemDirectoryHandle | null>(null)
  const [assemblySourceFileHandle, setAssemblySourceFileHandle] = useState<BrowserFileHandle | null>(null)
  const [assemblySourceFileName, setAssemblySourceFileName] = useState<string | null>(null)
  const [assemblyDocMeta, setAssemblyDocMeta] = useState<{ id: string; name: string }>({
    id: 'assembly-root',
    name: 'Assembly',
  })
  const [programLoadError, setProgramLoadError] = useState<string | null>(null)
  const [programSaveMessage, setProgramSaveMessage] = useState<string | null>(null)
  const [preAssemblyWizard, setPreAssemblyWizard] = useState<PreAssemblyWizard>(null)
  const [preAssemblySelection, setPreAssemblySelection] =
    useState<PreAssemblyPanelSelection>(null)
  const [activeProgramPartId, setActiveProgramPartId] = useState<string | null>(null)
  const [matesPopupOpen, setMatesPopupOpen] = useState(false)
  const [mateDraftSession, setMateDraftSession] = useState<MateDraftSession>(() =>
    createMateDraftSession(),
  )
  const [matesPickSlot, setMatesPickSlot] = useState<MatesPickSlot | null>(null)
  const matesPickSlotRef = useRef<MatesPickSlot | null>(null)
  matesPickSlotRef.current = matesPickSlot
  const applyMatesPickSlot = useCallback((slot: MatesPickSlot | null) => {
    matesPickSlotRef.current = slot
    setMatesPickSlot(slot)
  }, [])
  const [mateOffsetInput, setMateOffsetInput] = useState('0')
  const [mateSolverErrorKey, setMateSolverErrorKey] = useState<string | null>(null)
  const [assemblyMates, setAssemblyMates] = useState<AssemblyMate[]>([])
  const mateDraftSessionRef = useRef(mateDraftSession)
  mateDraftSessionRef.current = mateDraftSession
  const commitMateDraftSession = useCallback((next: MateDraftSession) => {
    mateDraftSessionRef.current = next
    setMateDraftSession(next)
  }, [])
  const patchMateDraftSession = useCallback(
    (patch: (session: MateDraftSession) => MateDraftSession) => {
      const next = patch(mateDraftSessionRef.current)
      mateDraftSessionRef.current = next
      setMateDraftSession(next)
    },
    [],
  )
  const programPartsRef = useRef(programParts)
  programPartsRef.current = programParts
  const assemblyMatesRef = useRef(assemblyMates)
  assemblyMatesRef.current = assemblyMates
  const programPartGeometriesRef = useRef(programPartGeometries)
  programPartGeometriesRef.current = programPartGeometries
  const modelLoaderRef = useRef<ModelLoaderHandle>(null)
  const assemblyLoaderRef = useRef<AssemblyLoaderHandle>(null)
  const programPartPickerRef = useRef<ProgramPartFilePickerHandle>(null)

  const preAssemblyActive = activeToolbarTab === 'preAssembly'
  const matesPickMode: MatesPickMode = matesPopupOpen
    ? { active: true, slot: matesPickSlot }
    : { active: false, slot: null }

  const programPartNameById = useMemo(
    () => buildProgramPartDisplayNameById(programParts),
    [programParts],
  )

  const matesToolbarDisabled = programParts.length < 2

  const activeProgramPartGeometry =
    activeProgramPartId && preAssemblyActive
      ? (programPartGeometries[activeProgramPartId] ?? null)
      : null

  const viewportSelectionModel =
    preAssemblyActive && activeProgramPartGeometry ? activeProgramPartGeometry : model

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
    setProgramPartGeometries((geometries) => {
      for (const g of Object.values(geometries)) {
        g.dispose()
      }
      return {}
    })
    setProgramPartAppearances({})
    setProgramParts([])
    setActiveProgramPartId(null)
    setAssemblySourceFileHandle(null)
    setAssemblySourceFileName(null)
    setAssemblyRootDirectoryHandle(null)
    setAssemblyDocMeta({ id: 'assembly-root', name: 'Assembly' })
    setPhantomDoc(null)
    setPhantomSourceFileHandle(null)
    setPhantomSourceFileName(null)
    setProgramLoadError(null)
    setProgramSaveMessage(null)
    setPreAssemblyWizard(null)
    setActiveToolbarTab('file')
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

  const canChangeViewMode = useMemo(
    () =>
      canChangeViewDisplayMode({
        hasMainModel: !!model,
        programPartGeometryCount: Object.keys(programPartGeometries).length,
        hasPhantomAssembly: !!phantomDoc,
      }),
    [model, programPartGeometries, phantomDoc],
  )

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
    const descriptors = entries.map((entry) => entry.part)
    // Identyfikatory detali generujemy raz — unikamy podwójnego append w React Strict Mode.
    const newParts = appendProgramParts([], descriptors)

    setProgramPartGeometries((geometries) => {
      const nextGeometries = { ...geometries }
      for (let i = 0; i < newParts.length; i++) {
        nextGeometries[newParts[i].id] = entries[i].geometry
      }
      return nextGeometries
    })

    setProgramPartAppearances((appearances) => {
      const nextAppearances = { ...appearances }
      for (let i = 0; i < newParts.length; i++) {
        nextAppearances[newParts[i].id] = entries[i].appearance
      }
      return nextAppearances
    })

    setProgramParts((current) => {
      const merged = mergeProgramPartsBatch(current, newParts)

      const geometriesForLayout: Record<string, BufferGeometry> = {
        ...programPartGeometries,
      }
      for (let i = 0; i < newParts.length; i++) {
        geometriesForLayout[newParts[i].id] = entries[i].geometry
      }
      const positions = layoutProgramPartPositionsMm(
        merged.map((part) => part.id),
        geometriesForLayout,
      )
      return assignProgramPartLayoutPositions(merged, positions)
    })

    setProgramPartsFitToken((token) => token + 1)
    setProgramLoadError(null)
    setActiveToolbarTab('preAssembly')
  }, [programPartGeometries])

  const applyTransformWithMates = useCallback(
    (partId: string, transform: PhantomTransform): PreAssemblyProgramPart[] => {
      return applyAssemblyMateConstraints({
        parts: programPartsRef.current,
        mates: assemblyMatesRef.current,
        geometries: programPartGeometriesRef.current,
        movedPartId: partId,
        movedTransform: transform,
      })
    },
    [],
  )

  const handleProgramPartTransformChange = useCallback(
    (partId: string, transform: PhantomTransform) => {
      setProgramParts(applyTransformWithMates(partId, transform))
    },
    [applyTransformWithMates],
  )

  const handleActiveProgramPartChange = useCallback((partId: string | null) => {
    setActiveProgramPartId(partId)
    if (partId) {
      setSelection(createEmptySelection())
      setProbableFaces([])
    }
  }, [])

  const handleProgramPartPickError = useCallback((message: string) => {
    setProgramLoadError(message)
  }, [])

  const handleRemoveProgramPart = useCallback((partId: string) => {
    setProgramParts((current) => {
      const next = removeProgramPart(current, partId)
      const partIds = new Set(next.map((part) => part.id))
      setAssemblyMates((mates) => filterAssemblyMatesForPartIds(mates, partIds))
      return next
    })
    setProgramPartGeometries((geometries) => {
      const next = { ...geometries }
      const geometry = next[partId]
      if (geometry) {
        geometry.dispose()
        delete next[partId]
      }
      return next
    })
    setProgramPartAppearances((appearances) => {
      const next = { ...appearances }
      delete next[partId]
      return next
    })
    setActiveProgramPartId((current) => (current === partId ? null : current))
    setProgramPartsFitToken((token) => token + 1)
  }, [])

  const applyAssemblyGeometries = useCallback(
    async (
      assemblyId: string,
      loadedParts: PreAssemblyProgramPart[],
      directory: FileSystemDirectoryHandle | null,
    ) => {
      if (loadedParts.length === 0) return
      const result = await loadGeometriesFromAssembly(assemblyId, loadedParts, directory)
      if (Object.keys(result.geometries).length > 0) {
        setProgramPartGeometries(result.geometries)
        setProgramPartAppearances(result.appearances)
        setProgramParts((current) =>
          reapplyAllAssemblyMates({
            parts: current,
            mates: assemblyMatesRef.current,
            geometries: result.geometries,
          }),
        )
        setProgramPartsFitToken((token) => token + 1)
      }
      const messages: string[] = []
      if (result.missingRefs.length > 0) {
        messages.push(
          i18n.t('preAssembly.loadAssembly.missingParts', {
            refs: result.missingRefs.join(', '),
          }),
        )
      }
      if (result.errors.length > 0) {
        messages.push(...result.errors)
      }
      setProgramLoadError(messages.length > 0 ? messages.join('\n') : null)
    },
    [],
  )

  const handleAssemblyLoad = useCallback(
    (
      file: AssemblyFile,
      sourceHandle?: BrowserFileHandle | null,
      fileName?: string,
    ) => {
      const loadedParts = programPartsFromAssemblyProgram(file.program)

      setProgramPartGeometries((geometries) => {
        disposeProgramPartGeometries(geometries)
        return {}
      })
      setProgramPartAppearances({})
      setProgramParts(loadedParts)
      setProgramPartsFitToken((token) => token + 1)
      const embeddedPhantom = phantomDocFromAssemblyFile(file)
      setPhantomDoc(embeddedPhantom)
      setPhantomSourceFileHandle(null)
      setPhantomSourceFileName(null)
      setPhantomLoadError(null)
      setAssemblySourceFileHandle(sourceHandle ?? null)
      setAssemblySourceFileName(fileName ?? null)
      setAssemblyDocMeta({ id: file.id, name: file.name })
      setAssemblyMates(file.mates ? [...file.mates] : [])
      setProgramLoadError(null)
      setProgramSaveMessage(null)
      setActiveToolbarTab('preAssembly')

      void (async () => {
        const root =
          assemblyRootDirectoryHandle ?? (await restoreAssemblyRootHandle(file.id))
        if (root) {
          setAssemblyRootDirectoryHandle(root)
          await persistAssemblyRootHandle(file.id, root)
        }
        await applyAssemblyGeometries(file.id, loadedParts, root)
      })()
    },
    [
      applyAssemblyGeometries,
      assemblyRootDirectoryHandle,
      disposeProgramPartGeometries,
    ],
  )

  const handleLoadAssemblyClick = useCallback(() => {
    setProgramLoadError(null)
    setProgramSaveMessage(null)
    void assemblyLoaderRef.current?.openFileDialog()
  }, [])

  const buildAssemblyFile = useCallback(() => {
    return createAssemblyFileFromProgram(programParts, {
      id: assemblyDocMeta.id,
      name: assemblyDocMeta.name,
      phantomDoc,
      mates: assemblyMates.length > 0 ? assemblyMates : undefined,
    })
  }, [assemblyDocMeta, assemblyMates, phantomDoc, programParts])

  const handleSaveAssemblyAsClick = useCallback(() => {
    const canSave = programParts.length > 0 || !!phantomDoc
    if (!canSave) return
    const baseName = assemblyDocMeta.name || stripEcdasmExtension(assemblySourceFileName)
    const assemblyFile = buildAssemblyFile()
    void (async () => {
      try {
        const { handle, fileName } = await saveAssemblyFileAs(
          assemblyFile,
          baseName,
          assemblySourceFileHandle ?? undefined,
        )
        setAssemblySourceFileHandle(handle)
        setAssemblySourceFileName(fileName)
        setProgramLoadError(null)
        setProgramSaveMessage(
          i18n.t('preAssembly.saveAssemblyAs.saved', { fileName }),
        )
      } catch (err: unknown) {
        if (isUserCancelError(err)) return
        const message = err instanceof Error ? err.message : String(err)
        setProgramSaveMessage(null)
        setProgramLoadError(message)
      }
    })()
  }, [
    assemblyDocMeta,
    assemblySourceFileHandle,
    assemblySourceFileName,
    buildAssemblyFile,
    phantomDoc,
    programParts.length,
  ])

  const handleSaveAssemblyClick = useCallback(() => {
    const canSave = programParts.length > 0 || !!phantomDoc
    if (!canSave) return
    const assemblyFile = buildAssemblyFile()
    const canOverwrite =
      !!assemblySourceFileHandle &&
      (assemblySourceFileName?.toLowerCase().endsWith('.ecdasm') ?? false)
    if (!canOverwrite) {
      handleSaveAssemblyAsClick()
      return
    }
    void (async () => {
      try {
        const savedName = await saveAssemblyToHandle(assemblyFile, assemblySourceFileHandle)
        const fileName = savedName ?? assemblySourceFileName ?? 'assembly.ecdasm'
        if (savedName) setAssemblySourceFileName(savedName)
        setProgramLoadError(null)
        setProgramSaveMessage(i18n.t('preAssembly.saveAssembly.saved', { fileName }))
      } catch (err: unknown) {
        if (isUserCancelError(err)) return
        const message = err instanceof Error ? err.message : String(err)
        setProgramSaveMessage(null)
        setProgramLoadError(message)
      }
    })()
  }, [
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
        closeMatesPopup()
      }
      return next
    })
  }, [preAssemblyToolbarUi.createAttachmentDisabled])

  const revertMatePreviewIfNeeded = useCallback(
    (session: MateDraftSession): MateDraftSession => {
      if (!mateDraftHasUnsavedApply(session)) return session
      const partId = session.movingPartId
      const revert = mateDraftRevert(session)
      if (revert.ok && partId) {
        handleProgramPartTransformChange(partId, revert.transform)
      }
      return revert.ok ? revert.session : session
    },
    [handleProgramPartTransformChange],
  )

  const closeMatesPopup = useCallback(() => {
    patchMateDraftSession((session) => revertMatePreviewIfNeeded(session))
    setMatesPopupOpen(false)
    applyMatesPickSlot(null)
    setMateSolverErrorKey(null)
  }, [applyMatesPickSlot, patchMateDraftSession, revertMatePreviewIfNeeded])

  const handleToggleMatesPopup = useCallback(() => {
    if (matesPopupOpen) {
      closeMatesPopup()
      return
    }
    setLimitsInstallActive(false)
    setAppearanceEditActive(false)
    setPreAssemblyWizard(null)
    commitMateDraftSession(createMateDraftSession())
    applyMatesPickSlot(null)
    setMateOffsetInput('0')
    setMateSolverErrorKey(null)
    setMatesPopupOpen(true)
  }, [applyMatesPickSlot, closeMatesPopup, commitMateDraftSession, matesPopupOpen])

  const handleMatePlanePicked = useCallback(
    (slot: MatesPickSlot, plane: MateDraftSession['draft']['planeA']) => {
      patchMateDraftSession((session) => mateDraftSetPlane(session, slot, plane))
      applyMatesPickSlot(null)
      setMateSolverErrorKey(null)
    },
    [applyMatesPickSlot, patchMateDraftSession],
  )

  const parsedMateOffsetMm = useMemo(() => {
    const trimmed = mateOffsetInput.trim()
    if (trimmed.length === 0) return 0
    const value = Number(trimmed.replace(',', '.'))
    return Number.isFinite(value) ? value : NaN
  }, [mateOffsetInput])

  const mateDraftForApply = useMemo(() => {
    if (!Number.isFinite(parsedMateOffsetMm)) return mateDraftSession.draft
    return { ...mateDraftSession.draft, offsetMm: parsedMateOffsetMm }
  }, [mateDraftSession.draft, parsedMateOffsetMm])

  const mateValidation = useMemo(
    () => validateParallelMateDraft(mateDraftForApply),
    [mateDraftForApply],
  )

  const canApplyMate =
    mateDraftSession.applyState === 'idle' && mateValidation.ok && Number.isFinite(parsedMateOffsetMm)

  const canSaveMate = mateDraftSession.applyState === 'applied'

  const handleMateApply = useCallback(() => {
    const draft = {
      ...mateDraftSessionRef.current.draft,
      offsetMm: parsedMateOffsetMm,
    }
    const result = executeMateApply({
      session: mateDraftSessionRef.current,
      draft,
      programParts: programPartsRef.current,
      programPartGeometries,
    })
    if (!result.ok) {
      if (result.reason === 'solverFailed') {
        setMateSolverErrorKey('mates.errors.missingGeometry')
      } else if (result.reason === 'missingGeometry' || result.reason === 'missingPart') {
        setMateSolverErrorKey('mates.errors.missingGeometry')
      }
      return
    }
    handleProgramPartTransformChange(result.movingPartId, result.transform)
    commitMateDraftSession(result.nextSession)
    setMateSolverErrorKey(null)
  }, [commitMateDraftSession, handleProgramPartTransformChange, parsedMateOffsetMm, programPartGeometries])

  const handleMateRevert = useCallback(() => {
    const partId = mateDraftSessionRef.current.movingPartId
    const revert = mateDraftRevert(mateDraftSessionRef.current)
    if (!revert.ok) return
    if (partId) {
      handleProgramPartTransformChange(partId, revert.transform)
    }
    commitMateDraftSession(revert.session)
    setMateSolverErrorKey(null)
  }, [commitMateDraftSession, handleProgramPartTransformChange])

  const handleMateSave = useCallback(() => {
    const saved = mateDraftSave(mateDraftSession, assemblyMates)
    if (!saved.ok) return
    setAssemblyMates(saved.mates)
    commitMateDraftSession(saved.session)
    setMateOffsetInput('0')
    applyMatesPickSlot(null)
    setMateSolverErrorKey(null)
  }, [applyMatesPickSlot, assemblyMates, commitMateDraftSession, mateDraftSession])

  const handleMateSaveAndClose = useCallback(() => {
    const saved = mateDraftSave(mateDraftSession, assemblyMates)
    if (!saved.ok) return
    setAssemblyMates(saved.mates)
    commitMateDraftSession(saved.session)
    setMateOffsetInput('0')
    applyMatesPickSlot(null)
    setMateSolverErrorKey(null)
    setMatesPopupOpen(false)
  }, [applyMatesPickSlot, assemblyMates, commitMateDraftSession, mateDraftSession])

  return (
    <div className={styles.app}>
      <Toolbar
        activeToolbarTab={activeToolbarTab}
        onActiveToolbarTabChange={setActiveToolbarTab}
        onLoadModelClick={handleLoadModelClick}
        onSaveModelClick={handleSaveModelClick}
        onSaveAsModelClick={handleSaveAsModelClick}
        hasModel={!!model}
        canChangeViewMode={canChangeViewMode}
        limitsInstallActive={limitsInstallActive}
        limitsAddDisabled={limitsAddDisabled}
        onToggleLimitsInstall={() => {
          setLimitsInstallActive((v) => {
            const next = !v
            if (next) {
              setAppearanceEditActive(false)
              setPreAssemblyWizard(null)
              closeMatesPopup()
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
              closeMatesPopup()
            }
            return next
          })
        }}
        matesPopupOpen={matesPopupOpen}
        matesToolbarDisabled={matesToolbarDisabled}
        onToggleMatesPopup={handleToggleMatesPopup}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        preAssemblyToolbarUi={preAssemblyToolbarUi}
        preAssemblyWizard={preAssemblyWizard}
        onLoadAssemblyClick={handleLoadAssemblyClick}
        onSaveAssemblyClick={handleSaveAssemblyClick}
        onSaveAssemblyAsClick={handleSaveAssemblyAsClick}
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
          programSaveMessage={programSaveMessage}
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
            programPartAppearances={programPartAppearances}
            programPartsFitToken={programPartsFitToken}
            preAssemblyActive={preAssemblyActive}
            activeProgramPartId={activeProgramPartId}
            onActiveProgramPartChange={handleActiveProgramPartChange}
            onProgramPartTransformChange={handleProgramPartTransformChange}
            resolveMateFollowers={
              assemblyMates.length > 0 ? applyTransformWithMates : undefined
            }
            matesPickMode={matesPickMode}
            matesPickSlotRef={matesPickSlotRef}
            onMatePlanePicked={handleMatePlanePicked}
          />
        </div>
        {matesPopupOpen && (
          <MatesPopup
            session={mateDraftSession}
            activePickSlot={matesPickSlot}
            offsetInput={mateOffsetInput}
            partNameById={programPartNameById}
            solverErrorKey={mateSolverErrorKey}
            canApply={canApplyMate}
            canSave={canSaveMate}
            onAlignmentChange={(alignment) => {
              patchMateDraftSession((session) => mateDraftUpdateDraft(session, { alignment }))
            }}
            onOffsetChange={setMateOffsetInput}
            onStartPick={(slot) => {
              applyMatesPickSlot(toggleMatesPickSlot(matesPickSlotRef.current, slot))
              setMateSolverErrorKey(null)
            }}
            onApply={handleMateApply}
            onRevert={handleMateRevert}
            onSave={handleMateSave}
            onSaveAndClose={handleMateSaveAndClose}
          />
        )}
        <RightPanel
          selection={selection}
          probableFaces={probableFaces}
          model={viewportSelectionModel}
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
      <AssemblyLoader
        ref={assemblyLoaderRef}
        onLoad={handleAssemblyLoad}
        onError={setProgramLoadError}
      />
      <ProgramPartFilePicker
        ref={programPartPickerRef}
        assemblyFileDirectory={assemblyRootDirectoryHandle}
        onPick={handleProgramPartsPicked}
        onError={handleProgramPartPickError}
      />
    </div>
  )
}

export default App
