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
  persistPartFileHandle,
  removePartFileHandle,
  resolveAssemblyProjectDirectory,
  resolveAssemblyRootFromFileHandle,
  saveAssemblyFileAs,
  saveAssemblyToHandle,
  stripEcdasmExtension,
  updateProgramPartTransform,
  type AssemblyFile,
  type AssemblyLoaderHandle,
  type PhantomAssemblyFile,
  type PhantomTransform,
  type PreAssemblyPanelSelection,
  type PreAssemblyProgramPart,
  type PreAssemblyWizard,
  type ProgramPartFilePickerHandle,
  type ProgramPartPickEntry,
  resolveViewportPreparedBinding,
} from './features/pre-assembly'
import { layoutProgramPartPositionsMm } from './features/pre-assembly/viewer'
import { loadGeometriesFromAssembly } from './features/pre-assembly/programParts/loadAssemblyProgramPartGeometries'
import { buildProgramPartDisplayNameById } from './features/pre-assembly/programParts/programPartDisplayName'
import { renameProgramPart } from './features/pre-assembly/programParts/renameProgramPart'
import { isUserCancelError } from './lib/isUserCancelError'
import {
  DOCUMENT_OPEN_FILE_ACCEPT,
  getDocumentSessionToolbarUi,
  pickOpenDocumentFile,
} from './features/document-session'
import { MatesPopup } from './components/assembly-mates'
import {
  buildViewerContextMenuItems,
  ViewerContextMenu,
  type ViewerContextMenuState,
} from './components/viewer-context-menu'
import {
  applyMateFaceClick,
  clearMateFacePair,
  createEmptyMateFacePair,
  createMateDraftSession,
  mateDraftHasUnsavedApply,
  mateDraftRevert,
  mateDraftSave,
  mateDraftSetEntity,
  mateDraftUpdateDraft,
  executeMateApply,
  validateParallelMateDraft,
  applyAssemblyMateConstraints,
  filterAssemblyMatesForPartIds,
  reapplyAllAssemblyMates,
  initialMatesPickSlot,
  mateFacePairToHighlights,
  nextMatesPickFlowStep,
  openMateFromFacePair,
  buildMateEntityHighlightsForPopup,
  removeAssemblyMate,
  syncProgramPartsAfterMatesChange,
  toggleAssemblyMateSuppressed,
  type AssemblyMate,
  type MateDraftSession,
  type MateEntityHighlights,
  type MateFacePair,
  type MatesPickMode,
  type MatesPickSlot,
  toggleMatesPickSlot,
} from './features/assembly-mates'
import {
  DocumentTreeOverlay,
  createCustomSizeConstraint,
  filterPartLocksForPartIds,
  isPartLocked,
  lockedPartIdSet,
  mergeMateEntityHighlights,
  togglePartLock,
} from './features/document-tree'
import {
  createClearedViewportSelectionState,
  nextViewportSelectionClearEpoch,
} from './features/viewer-selection'
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
  const [programPartConstraints, setProgramPartConstraints] = useState<
    Record<string, PreparedElementConstraints>
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
  const [partLockedById, setPartLockedById] = useState<Record<string, boolean>>({})
  const [treeMateHighlights, setTreeMateHighlights] = useState<MateEntityHighlights | null>(null)
  const [mateFacePair, setMateFacePair] = useState<MateFacePair>(() => createEmptyMateFacePair())
  const mateFacePairRef = useRef(mateFacePair)
  mateFacePairRef.current = mateFacePair
  const [viewerContextMenu, setViewerContextMenu] = useState<ViewerContextMenuState | null>(null)
  /** Inkrement przy clear pustego kliknięcia — drzewo dokumentu resetuje zaznaczenie węzła. */
  const [viewportSelectionClearEpoch, setViewportSelectionClearEpoch] = useState(0)
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
  /** Twardy reset UI mates (bez revert preview) — przy zmianie dokumentu. */
  const resetMatesSessionUi = useCallback(() => {
    setMatesPopupOpen(false)
    applyMatesPickSlot(null)
    commitMateDraftSession(createMateDraftSession())
    setMateOffsetInput('0')
    setMateSolverErrorKey(null)
    setTreeMateHighlights(null)
    setMateFacePair(clearMateFacePair())
    setViewerContextMenu(null)
    setPartLockedById({})
  }, [applyMatesPickSlot, commitMateDraftSession])
  const programPartsRef = useRef(programParts)
  programPartsRef.current = programParts
  const assemblyMatesRef = useRef(assemblyMates)
  assemblyMatesRef.current = assemblyMates
  const programPartGeometriesRef = useRef(programPartGeometries)
  programPartGeometriesRef.current = programPartGeometries
  const programPartConstraintsRef = useRef(programPartConstraints)
  programPartConstraintsRef.current = programPartConstraints
  const partLockedByIdRef = useRef(partLockedById)
  partLockedByIdRef.current = partLockedById
  const assemblyLoadGenerationRef = useRef(0)
  const modelLoaderRef = useRef<ModelLoaderHandle>(null)
  const assemblyLoaderRef = useRef<AssemblyLoaderHandle>(null)
  const programPartPickerRef = useRef<ProgramPartFilePickerHandle>(null)

  /** Montaż w sesji (program / fantom) — niezależnie od zakładki paska. */
  const preAssemblyActive = programParts.length > 0 || !!phantomDoc
  const matesPickMode: MatesPickMode = matesPopupOpen
    ? { active: true, slot: matesPickSlot }
    : { active: false, slot: null }

  const mateEntityHighlights = useMemo(() => {
    const popupHighlights = buildMateEntityHighlightsForPopup(
      matesPopupOpen,
      mateDraftSession.draft.entityA,
      mateDraftSession.draft.entityB,
    )
    const pairHighlights = matesPopupOpen ? null : mateFacePairToHighlights(mateFacePair)
    return mergeMateEntityHighlights(
      popupHighlights,
      mergeMateEntityHighlights(pairHighlights, treeMateHighlights),
    )
  }, [
    matesPopupOpen,
    mateDraftSession.draft.entityA,
    mateDraftSession.draft.entityB,
    mateFacePair,
    treeMateHighlights,
  ])

  const programPartNameById = useMemo(
    () => buildProgramPartDisplayNameById(programParts),
    [programParts],
  )

  const matesToolbarDisabled = programParts.length < 2

  const viewportPrepared = useMemo(
    () =>
      resolveViewportPreparedBinding({
        preAssemblyActive,
        activeProgramPartId,
        programPartGeometries,
        programPartConstraints,
        mainModel: model,
        mainPrepared: preparedConstraints,
      }),
    [
      preAssemblyActive,
      activeProgramPartId,
      programPartGeometries,
      programPartConstraints,
      model,
      preparedConstraints,
    ],
  )

  const viewportSelectionModel = viewportPrepared.model
  const viewportPreparedModelElements = viewportPrepared.modelElements
  const viewportFaceConstraints = viewportPrepared.faceConstraints
  const editingProgramPartId = viewportPrepared.activeProgramPartId

  const selectedPhantomAnchorId = preAssemblySelectionAnchorId(preAssemblySelection)
  const selectedPhantomElementId = preAssemblySelectionElementId(preAssemblySelection)

  /** Globalna reguła: LKM w puste miejsce zawsze czyści wszystkie zaznaczenia. */
  const clearAllSelection = useCallback(() => {
    const cleared = createClearedViewportSelectionState()
    setSelection(cleared.selection)
    setProbableFaces(cleared.probableFaces)
    setActiveProgramPartId(cleared.activeProgramPartId)
    setTreeMateHighlights(cleared.treeMateHighlights)
    setMateFacePair(clearMateFacePair())
    setViewerContextMenu(null)
    setPreAssemblySelection(cleared.preAssemblySelection)
    setFocusedLimitConstraintId(cleared.focusedLimitConstraintId)
    setLimitsInstallActive(cleared.limitsInstallActive)
    setAppearanceEditActive(cleared.appearanceEditActive)
    setViewportSelectionClearEpoch((n) => nextViewportSelectionClearEpoch(n))
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
    assemblyLoadGenerationRef.current += 1
    setProgramPartGeometries((geometries) => {
      for (const g of Object.values(geometries)) {
        g.dispose()
      }
      return {}
    })
    setProgramPartAppearances({})
    setProgramPartConstraints({})
    setProgramParts([])
    setActiveProgramPartId(null)
    setAssemblySourceFileHandle(null)
    setAssemblySourceFileName(null)
    setAssemblyRootDirectoryHandle(null)
    setAssemblyDocMeta({ id: 'assembly-root', name: 'Assembly' })
    assemblyMatesRef.current = []
    setAssemblyMates([])
    resetMatesSessionUi()
    setPhantomDoc(null)
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

  const handleViewportAppearanceChange = useCallback(
    (next: ModelAppearance) => {
      if (editingProgramPartId) {
        setProgramPartAppearances((current) => ({
          ...current,
          [editingProgramPartId]: next,
        }))
        if (next.surface === 'texture') {
          setDisplayMode((mode) => (mode === 'edgesOnly' ? mode : 'solidTextured'))
        }
        return
      }
      handleAppearanceChange(next)
    },
    [editingProgramPartId, handleAppearanceChange],
  )

  const handleMergeModelElements = useCallback(
    (newElements: readonly PreparedModelElement[]) => {
      const mergeInto = (
        prev: PreparedElementConstraints,
      ): PreparedElementConstraints => {
        const existing = [...(prev.modelElements ?? [])]
        const ids = new Set(existing.map((e) => e.id))
        for (const el of newElements) {
          if (ids.has(el.id)) continue
          ids.add(el.id)
          existing.push({ ...el, faceIndices: [...el.faceIndices] })
        }
        return { ...prev, modelElements: existing } as PreparedElementConstraints
      }

      if (editingProgramPartId) {
        setProgramPartConstraints((current) => {
          const prev =
            current[editingProgramPartId] ??
            ({ mode: 'fixed', faceConstraints: [], modelElements: [] } as PreparedElementConstraints)
          return { ...current, [editingProgramPartId]: mergeInto(prev) }
        })
        return
      }
      setPreparedConstraints((prev) => mergeInto(prev))
    },
    [editingProgramPartId],
  )

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
    setPreparedConstraints(
      (prev) => ({ ...prev, faceConstraints: next }) as PreparedElementConstraints,
    )
  }, [])

  const handleViewportFaceConstraintsChange = useCallback(
    (next: FaceConstraint[]) => {
      if (editingProgramPartId) {
        setProgramPartConstraints((current) => {
          const prev =
            current[editingProgramPartId] ??
            ({ mode: 'fixed', faceConstraints: [], modelElements: [] } as PreparedElementConstraints)
          return {
            ...current,
            [editingProgramPartId]: { ...prev, faceConstraints: next } as PreparedElementConstraints,
          }
        })
        return
      }
      handleFaceConstraintsChange(next)
    },
    [editingProgramPartId, handleFaceConstraintsChange],
  )

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
      const target = viewportSelectionModel
      if (!target) return
      rotateGeometryAroundCenter(target, rotationDeg)
      clearMeshTopologyCaches(target)
      setGeometryRevision((n) => n + 1)
    },
    [viewportSelectionModel],
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

  const handleViewportApplyTwoFaceStretch = useCallback(
    (
      targetMm: number,
      overlay?: ApplyTwoFaceStretchOverlay,
    ):
      | { ok: true; geometry: BufferGeometry; effectiveTargetMm: number }
      | { ok: false; error: TwoFaceStretchError | PreparedStretchPrecheckError } => {
      if (editingProgramPartId) {
        const targetGeometry = viewportSelectionModel
        if (!targetGeometry) {
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

        const preparedForStretch = programPartConstraintsRef.current[editingProgramPartId] ?? {
          mode: 'fixed' as const,
          faceConstraints: [],
          modelElements: [],
        }

        const result = applyTwoFaceStretchWithConstraints({
          geometry: targetGeometry,
          targetMm,
          mergedFaces,
          prepared: preparedForStretch,
          constraintsLocked,
          overlay,
        })
        if (result.ok) {
          if (result.geometry !== targetGeometry) {
            setProgramPartGeometries((current) => ({
              ...current,
              [editingProgramPartId]: result.geometry,
            }))
          }
          setGeometryRevision((n) => n + 1)
        }
        return result
      }
      return handleApplyTwoFaceStretch(targetMm, overlay)
    },
    [
      editingProgramPartId,
      viewportSelectionModel,
      selection,
      probableFaces,
      constraintsLocked,
      handleApplyTwoFaceStretch,
    ],
  )

  const documentOpenInputRef = useRef<HTMLInputElement>(null)

  const handleOpenDocumentClick = useCallback(() => {
    setLoadError(null)
    setProgramLoadError(null)
    void (async () => {
      const picked = await pickOpenDocumentFile({
        fallbackInput: documentOpenInputRef.current,
      })
      if (!picked.ok) {
        if (picked.reason === 'unsupported') {
          setLoadError(i18n.t('toolbar.openUnsupported'))
        }
        return
      }
      if (picked.kind === 'assembly') {
        await assemblyLoaderRef.current?.loadFile(picked.file, picked.handle)
        return
      }
      await modelLoaderRef.current?.loadFile(picked.file, picked.handle)
    })()
  }, [i18n])

  const handleSavePartClick = useCallback(() => {
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

  const handleSaveAsPartClick = useCallback(() => {
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

  const documentSessionToolbarUi = getDocumentSessionToolbarUi({
    hasMainModel: !!model,
    programPartCount: programParts.length,
    hasPhantom: !!phantomDoc,
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

  const handleCreatePhantom = useCallback(() => {
    if (!documentSessionToolbarUi.canCreatePhantom) return
    setPhantomDoc(
      createEmptyPhantomFile({ name: i18n.t('preAssembly.createPhantom.defaultName') }),
    )
    setPhantomSourceFileName(null)
    setPhantomLoadError(null)
    setPreAssemblyWizard(null)
    setPreAssemblySelection({ kind: 'envelope' })
    setLimitsInstallActive(false)
    setAppearanceEditActive(false)
  }, [documentSessionToolbarUi.canCreatePhantom, i18n])

  const handleAddPart = useCallback(() => {
    if (!documentSessionToolbarUi.canAddPart) return
    setProgramLoadError(null)
    void programPartPickerRef.current?.openFileDialog()
    setLimitsInstallActive(false)
    setAppearanceEditActive(false)
  }, [documentSessionToolbarUi.canAddPart])

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

    setProgramPartConstraints((constraints) => {
      const nextConstraints = { ...constraints }
      for (let i = 0; i < newParts.length; i++) {
        nextConstraints[newParts[i].id] = entries[i].constraints
      }
      return nextConstraints
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
    setActiveToolbarTab('file')

    const assemblyId = assemblyDocMeta.id
    void (async () => {
      for (const entry of entries) {
        if (entry.sourceHandle) {
          await persistPartFileHandle(assemblyId, entry.part.ref, entry.sourceHandle)
        }
      }
      if (!assemblyRootDirectoryHandle) {
        const firstHandle = entries.find((entry) => entry.sourceHandle)?.sourceHandle
        const root = await resolveAssemblyRootFromFileHandle(firstHandle)
        if (root) {
          setAssemblyRootDirectoryHandle(root)
          await resolveAssemblyProjectDirectory({
            assemblyId,
            currentRoot: root,
            assemblySourceHandle: null,
          })
        }
      }
    })()
  }, [assemblyDocMeta.id, assemblyRootDirectoryHandle, programPartGeometries])

  const applyTransformWithMates = useCallback(
    (partId: string, transform: PhantomTransform): PreAssemblyProgramPart[] => {
      return applyAssemblyMateConstraints({
        parts: programPartsRef.current,
        mates: assemblyMatesRef.current,
        geometries: programPartGeometriesRef.current,
        movedPartId: partId,
        movedTransform: transform,
        lockedPartIds: lockedPartIdSet(partLockedByIdRef.current),
      })
    },
    [],
  )

  const isProgramPartLocked = useCallback(
    (partId: string) => isPartLocked(partLockedByIdRef.current, partId),
    [],
  )

  const handleProgramPartTransformChange = useCallback(
    (partId: string, transform: PhantomTransform) => {
      if (isProgramPartLocked(partId)) return
      setProgramParts(applyTransformWithMates(partId, transform))
    },
    [applyTransformWithMates, isProgramPartLocked],
  )

  const handleTogglePartLock = useCallback((partId: string) => {
    setPartLockedById((current) => togglePartLock(current, partId))
  }, [])

  /**
   * Globalna reguła: każda mutacja mates[] → natychmiast sync pozycji detali.
   * @see syncProgramPartsAfterMatesChange / .cursor/rules/mates-sync-program-parts.mdc
   */
  const commitAssemblyMates = useCallback((nextMates: AssemblyMate[]) => {
    assemblyMatesRef.current = nextMates
    setAssemblyMates(nextMates)
    setProgramParts((current) => {
      const synced = syncProgramPartsAfterMatesChange({
        parts: current,
        mates: nextMates,
        geometries: programPartGeometriesRef.current,
      })
      programPartsRef.current = synced
      return synced
    })
  }, [])

  const handleDeleteAssemblyMate = useCallback(
    (mateId: string) => {
      commitAssemblyMates(removeAssemblyMate(assemblyMatesRef.current, mateId))
      setTreeMateHighlights(null)
    },
    [commitAssemblyMates],
  )

  const handleToggleMateSuppressed = useCallback(
    (mateId: string) => {
      commitAssemblyMates(toggleAssemblyMateSuppressed(assemblyMatesRef.current, mateId))
    },
    [commitAssemblyMates],
  )

  const handleDocumentTreeEditAppearance = useCallback(
    (partId: string | null) => {
      if (partId) {
        setActiveProgramPartId(partId)
        setSelection(createEmptySelection())
        setProbableFaces([])
      }
      setLimitsInstallActive(false)
      setAppearanceEditActive(true)
    },
    [],
  )

  const handleDocumentTreeHighlightElementFaces = useCallback(
    (partId: string | null, faceIndices: number[]) => {
      // W montażu overlay idzie tylko na activePart — ustaw aktywną część przed faces.
      if (partId) setActiveProgramPartId(partId)
      setSelection(selectFaces(createEmptySelection(), faceIndices, 'replace'))
      setProbableFaces([])
    },
    [],
  )

  const handleDocumentTreeRenamePart = useCallback(
    (node: { partId?: string }, displayName: string) => {
      if (!node.partId) return
      // Tylko wpis w programie .ecdasm — ref / plik .ecdprt bez zmian
      setProgramParts((current) => renameProgramPart(current, node.partId!, displayName))
    },
    [],
  )

  const handleDocumentTreeRenameSize = useCallback(
    (
      node: {
        constraintId?: string
        partId?: string
        faceIndices?: number[]
        sizeMm?: number
      },
      displayName: string,
    ) => {
      const name = displayName.trim()
      if (node.constraintId) {
        const patchList = (list: FaceConstraint[]): FaceConstraint[] =>
          list.map((c) =>
            c.id === node.constraintId
              ? ({ ...c, displayName: name || undefined } as FaceConstraint)
              : c,
          )
        if (node.partId) {
          setProgramPartConstraints((current) => {
            const prev =
              current[node.partId!] ??
              ({ mode: 'fixed', faceConstraints: [], modelElements: [] } as PreparedElementConstraints)
            return {
              ...current,
              [node.partId!]: {
                ...prev,
                faceConstraints: patchList(prev.faceConstraints ?? []),
              } as PreparedElementConstraints,
            }
          })
          return
        }
        setPreparedConstraints(
          (prev) =>
            ({
              ...prev,
              faceConstraints: patchList(prev.faceConstraints ?? []),
            }) as PreparedElementConstraints,
        )
        return
      }

      // Brak limitu — utwórz minmax z nazwą (granice z faceIndices węzła).
      const faces = node.faceIndices ?? []
      if (faces.length < 2 || !name) return
      const geo = node.partId ? programPartGeometries[node.partId] ?? null : model
      if (!geo) return
      const existing =
        (node.partId
          ? programPartConstraints[node.partId]?.modelElements
          : preparedConstraints.modelElements) ?? []
      const created = createCustomSizeConstraint({
        geometry: geo,
        existingElements: existing,
        mergedFaceIndices: faces,
        targetMm: node.sizeMm && node.sizeMm > 0 ? node.sizeMm : 1,
        displayName: name,
        type: 'minmax',
      })
      if (!created.ok) return
      if (node.partId) {
        setProgramPartConstraints((current) => {
          const prev =
            current[node.partId!] ??
            ({ mode: 'fixed', faceConstraints: [], modelElements: [] } as PreparedElementConstraints)
          return {
            ...current,
            [node.partId!]: {
              ...prev,
              modelElements: created.modelElements,
              faceConstraints: [...(prev.faceConstraints ?? []), created.constraint],
            } as PreparedElementConstraints,
          }
        })
      } else {
        setPreparedConstraints(
          (prev) =>
            ({
              ...prev,
              modelElements: created.modelElements,
              faceConstraints: [...(prev.faceConstraints ?? []), created.constraint],
            }) as PreparedElementConstraints,
        )
      }
    },
    [model, preparedConstraints.modelElements, programPartConstraints, programPartGeometries],
  )

  const handleDocumentTreeApplySizeEdit = useCallback(
    (
      node: {
        partId?: string
        faceIndices?: number[]
        constraintId?: string
        displayName?: string
        sizeMm?: number
      },
      payload: {
        valueMm: number
        limitType: FaceConstraintType | 'free'
        minMm?: number
        maxMm?: number
      },
    ) => {
      const faces = node.faceIndices ?? []
      if (faces.length < 2) return
      const { valueMm, limitType, minMm, maxMm } = payload

      // CONST: nie stretchuj geometrii (wartość zablokowana)
      if (limitType !== 'const') {
        // Stretch konkretnej geometrii węzła (partId), nie tylko aktywnego viewportu
        let stretch:
          | { ok: true; geometry: BufferGeometry; effectiveTargetMm: number }
          | { ok: false; error: TwoFaceStretchError | PreparedStretchPrecheckError }
        if (node.partId) {
          const targetGeometry = programPartGeometries[node.partId]
          if (!targetGeometry) return
          const preparedForStretch = programPartConstraints[node.partId] ?? {
            mode: 'fixed' as const,
            faceConstraints: [],
            modelElements: [],
          }
          stretch = applyTwoFaceStretchWithConstraints({
            geometry: targetGeometry,
            targetMm: valueMm,
            mergedFaces: faces,
            prepared: preparedForStretch,
            constraintsLocked,
          })
          if (stretch.ok) {
            const nextGeo = stretch.geometry
            const partId = node.partId
            setProgramPartGeometries((current) => ({
              ...current,
              [partId]: nextGeo,
            }))
            setGeometryRevision((n) => n + 1)
          }
        } else {
          stretch = handleApplyTwoFaceStretch(valueMm, { mergedFaces: faces })
        }
        if (!stretch.ok) return
      }

      if (limitType === 'free') {
        // Tylko stretch; zostaw istniejący constraint bez zmian (usuwanie = removeSizeLimit)
        return
      }

      const buildConstraint = (base: {
        id: string
        facePair: FaceConstraint['facePair']
        elementAId?: string
        elementBId?: string
        displayName?: string
      }): FaceConstraint => {
        if (limitType === 'minmax') {
          return {
            ...base,
            type: 'minmax',
            minMm: minMm != null && Number.isFinite(minMm) ? Math.max(0, minMm) : 0,
            maxMm: maxMm != null && Number.isFinite(maxMm) && maxMm > 0 ? maxMm : valueMm,
          }
        }
        if (limitType === 'const') {
          return { ...base, type: 'const', valueMm }
        }
        if (limitType === 'min') {
          return {
            ...base,
            type: 'min',
            valueMm: minMm != null && Number.isFinite(minMm) ? minMm : valueMm,
          }
        }
        return {
          ...base,
          type: 'max',
          valueMm: maxMm != null && Number.isFinite(maxMm) ? maxMm : valueMm,
        }
      }

      if (node.constraintId) {
        const patchConstraint = (c: FaceConstraint): FaceConstraint => {
          if (c.id !== node.constraintId) return c
          return buildConstraint({
            id: c.id,
            facePair: c.facePair,
            elementAId: c.elementAId,
            elementBId: c.elementBId,
            displayName: c.displayName,
          })
        }
        if (node.partId) {
          setProgramPartConstraints((current) => {
            const prev =
              current[node.partId!] ??
              ({ mode: 'fixed', faceConstraints: [], modelElements: [] } as PreparedElementConstraints)
            return {
              ...current,
              [node.partId!]: {
                ...prev,
                faceConstraints: (prev.faceConstraints ?? []).map(patchConstraint),
              } as PreparedElementConstraints,
            }
          })
        } else {
          setPreparedConstraints(
            (prev) =>
              ({
                ...prev,
                faceConstraints: (prev.faceConstraints ?? []).map(patchConstraint),
              }) as PreparedElementConstraints,
          )
        }
        return
      }

      // Brak constraint — utwórz nowy przy wyborze limitu
      const geo = node.partId ? programPartGeometries[node.partId] ?? null : model
      if (!geo) return
      const existing =
        (node.partId
          ? programPartConstraints[node.partId]?.modelElements
          : preparedConstraints.modelElements) ?? []
      const created = createCustomSizeConstraint({
        geometry: geo,
        existingElements: existing,
        mergedFaceIndices: faces,
        targetMm: valueMm,
        displayName: node.displayName,
        type: limitType as 'minmax' | 'const' | 'min' | 'max',
      })
      if (!created.ok) return
      const patched = buildConstraint({
        id: created.constraint.id,
        facePair: created.constraint.facePair,
        elementAId: created.constraint.elementAId,
        elementBId: created.constraint.elementBId,
        displayName: created.constraint.displayName,
      })
      if (node.partId) {
        setProgramPartConstraints((current) => {
          const prev =
            current[node.partId!] ??
            ({ mode: 'fixed', faceConstraints: [], modelElements: [] } as PreparedElementConstraints)
          return {
            ...current,
            [node.partId!]: {
              ...prev,
              modelElements: created.modelElements,
              faceConstraints: [...(prev.faceConstraints ?? []), patched],
            } as PreparedElementConstraints,
          }
        })
      } else {
        setPreparedConstraints(
          (prev) =>
            ({
              ...prev,
              modelElements: created.modelElements,
              faceConstraints: [...(prev.faceConstraints ?? []), patched],
            }) as PreparedElementConstraints,
        )
      }
    },
    [
      constraintsLocked,
      handleApplyTwoFaceStretch,
      model,
      preparedConstraints.modelElements,
      programPartConstraints,
      programPartGeometries,
    ],
  )

  const handleDocumentTreeRemoveSizeLimit = useCallback(
    (node: { constraintId?: string; partId?: string; sizeStatus?: string }) => {
      if (!node.constraintId) return
      // Tylko limit elementarny tego rozmiaru — nie block/panel/profil (wspólne dla X/Y/Z)
      const status = node.sizeStatus
      if (
        status !== 'min' &&
        status !== 'max' &&
        status !== 'minmax' &&
        status !== 'const' &&
        status !== 'block' &&
        status !== 'panel' &&
        status !== 'profil'
      ) {
        return
      }
      const idToRemove = node.constraintId
      const filterOut = (list: FaceConstraint[]) => list.filter((c) => c.id !== idToRemove)
      if (node.partId) {
        setProgramPartConstraints((current) => {
          const prev =
            current[node.partId!] ??
            ({ mode: 'fixed', faceConstraints: [], modelElements: [] } as PreparedElementConstraints)
          const before = (prev.faceConstraints ?? []).length
          const nextList = filterOut(prev.faceConstraints ?? [])
          return {
            ...current,
            [node.partId!]: {
              ...prev,
              faceConstraints: nextList,
            } as PreparedElementConstraints,
          }
        })
        return
      }
      setPreparedConstraints(
        (prev) => {
          const before = (prev.faceConstraints ?? []).length
          const nextList = filterOut(prev.faceConstraints ?? [])
          return {
            ...prev,
            faceConstraints: nextList,
          } as PreparedElementConstraints
        },
      )
    },
    [],
  )

  const handleDocumentTreeAddCustomSize = useCallback(
    (partId: string | null) => {
      if (partId) setActiveProgramPartId(partId)
      // Użyj bieżącego zaznaczenia dwóch płaszczyzn (stretch) — jak w Dimensions.
      const faces = [...selection.faces]
      const seen = new Set(faces)
      for (const fi of probableFaces) {
        if (!seen.has(fi)) faces.push(fi)
      }
      if (faces.length < 2) {
        setLimitsInstallActive(false)
        setAppearanceEditActive(false)
        return
      }

      const geo = partId
        ? programPartGeometries[partId] ?? null
        : model
      if (!geo) return

      const existing =
        (partId
          ? programPartConstraints[partId]?.modelElements
          : preparedConstraints.modelElements) ?? []

      const measured = createCustomSizeConstraint({
        geometry: geo,
        existingElements: existing,
        mergedFaceIndices: faces,
        targetMm: 1,
        type: 'minmax',
      })
      if (!measured.ok) return
      const withGap = createCustomSizeConstraint({
        geometry: geo,
        existingElements: existing,
        mergedFaceIndices: faces,
        targetMm: measured.gapMm,
        type: 'minmax',
      })
      if (!withGap.ok) return

      if (partId) {
        setProgramPartConstraints((current) => {
          const prev =
            current[partId] ??
            ({ mode: 'fixed', faceConstraints: [], modelElements: [] } as PreparedElementConstraints)
          return {
            ...current,
            [partId]: {
              ...prev,
              modelElements: withGap.modelElements,
              faceConstraints: [...(prev.faceConstraints ?? []), withGap.constraint],
            } as PreparedElementConstraints,
          }
        })
      } else {
        setPreparedConstraints(
          (prev) =>
            ({
              ...prev,
              modelElements: withGap.modelElements,
              faceConstraints: [...(prev.faceConstraints ?? []), withGap.constraint],
            }) as PreparedElementConstraints,
        )
      }
    },
    [
      model,
      probableFaces,
      preparedConstraints.modelElements,
      programPartConstraints,
      programPartGeometries,
      selection.faces,
    ],
  )

  /** Ustaw transform bez re-snap zapisanych mates (preview / revert draft). */
  const setProgramPartTransformDirect = useCallback(
    (partId: string, transform: PhantomTransform) => {
      setProgramParts((current) => {
        const next = updateProgramPartTransform(current, partId, transform)
        programPartsRef.current = next
        return next
      })
    },
    [],
  )

  const handleActiveProgramPartChange = useCallback((partId: string | null) => {
    setActiveProgramPartId(partId)
    if (partId) {
      setSelection(createEmptySelection())
      setProbableFaces([])
      // mateFacePair nie czyścimy — para ścian na dwóch detalach.
    }
  }, [])

  const handleMateFaceClick = useCallback(
    (payload: {
      partId: string
      seedFaceIndex: number
      faceIndices: readonly number[]
      modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }
    }) => {
      if (payload.faceIndices.length === 0 || payload.seedFaceIndex < 0) {
        setMateFacePair(clearMateFacePair())
        return
      }
      setMateFacePair((current) => {
        const result = applyMateFaceClick({
          pair: current,
          partId: payload.partId,
          seedFaceIndex: payload.seedFaceIndex,
          faceIndices: payload.faceIndices,
          modifiers: payload.modifiers,
        })
        return result.pair
      })
    },
    [],
  )

  const handleViewerContextMenu = useCallback((payload: { clientX: number; clientY: number }) => {
    setViewerContextMenu({ x: payload.clientX, y: payload.clientY })
  }, [])

  const handleProgramPartPickError = useCallback((message: string) => {
    setProgramLoadError(message)
  }, [])

  const handleRemoveProgramPart = useCallback((partId: string) => {
    const removedPart = programPartsRef.current.find((part) => part.id === partId)
    setMateFacePair((pair) => {
      if (pair.first?.partId === partId || pair.second?.partId === partId) {
        return clearMateFacePair()
      }
      return pair
    })
    setProgramParts((current) => {
      const next = removeProgramPart(current, partId)
      const partIds = new Set(next.map((part) => part.id))
      const nextMates = filterAssemblyMatesForPartIds(assemblyMatesRef.current, partIds)
      assemblyMatesRef.current = nextMates
      setAssemblyMates(nextMates)
      setPartLockedById((locks) => filterPartLocksForPartIds(locks, partIds))
      const synced = syncProgramPartsAfterMatesChange({
        parts: next,
        mates: nextMates,
        geometries: programPartGeometriesRef.current,
      })
      programPartsRef.current = synced
      return synced
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
    setProgramPartConstraints((constraints) => {
      const next = { ...constraints }
      delete next[partId]
      return next
    })
    setActiveProgramPartId((current) => (current === partId ? null : current))
    setProgramPartsFitToken((token) => token + 1)
    if (removedPart) {
      void removePartFileHandle(assemblyDocMeta.id, removedPart.ref)
    }
  }, [assemblyDocMeta.id])

  const applyAssemblyGeometries = useCallback(
    async (
      assemblyId: string,
      loadedParts: PreAssemblyProgramPart[],
      directory: FileSystemDirectoryHandle | null,
      loadGeneration: number,
    ) => {
      if (loadedParts.length === 0) {
        return {
          geometries: {},
          appearances: {},
          constraints: {},
          loadedCount: 0,
          missingRefs: [],
          errors: [],
        }
      }
      const result = await loadGeometriesFromAssembly(assemblyId, loadedParts, directory)
      if (loadGeneration !== assemblyLoadGenerationRef.current) {
        disposeProgramPartGeometries(result.geometries)
        return result
      }
      if (Object.keys(result.geometries).length > 0) {
        setProgramPartGeometries(result.geometries)
        setProgramPartAppearances(result.appearances)
        setProgramPartConstraints(result.constraints)
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
      return result
    },
    [disposeProgramPartGeometries, i18n],
  )

  const handleAssemblyLoad = useCallback(
    (
      file: AssemblyFile,
      sourceHandle?: BrowserFileHandle | null,
      fileName?: string,
    ) => {
      const loadGeneration = ++assemblyLoadGenerationRef.current
      const loadedParts = programPartsFromAssemblyProgram(file.program)
      const nextMates = file.mates ? [...file.mates] : []

      setProgramPartGeometries((geometries) => {
        disposeProgramPartGeometries(geometries)
        return {}
      })
      setProgramPartAppearances({})
      setProgramPartConstraints({})
      setProgramParts(loadedParts)
      setActiveProgramPartId(null)
      setSelection(createEmptySelection())
      setProbableFaces([])
      setProgramPartsFitToken((token) => token + 1)
      const embeddedPhantom = phantomDocFromAssemblyFile(file)
      setPhantomDoc(embeddedPhantom)
      setPhantomSourceFileName(null)
      setPhantomLoadError(null)
      setAssemblySourceFileHandle(sourceHandle ?? null)
      setAssemblySourceFileName(fileName ?? null)
      setAssemblyDocMeta({ id: file.id, name: file.name })
      assemblyMatesRef.current = nextMates
      setAssemblyMates(nextMates)
      resetMatesSessionUi()
      setProgramLoadError(null)
      setProgramSaveMessage(null)
      setActiveToolbarTab('file')

      void (async () => {
        let root = await resolveAssemblyProjectDirectory({
          assemblyId: file.id,
          currentRoot: assemblyRootDirectoryHandle,
          assemblySourceHandle: sourceHandle ?? null,
        })
        if (loadGeneration !== assemblyLoadGenerationRef.current) return
        if (root) {
          setAssemblyRootDirectoryHandle(root)
        }

        const result = await applyAssemblyGeometries(
          file.id,
          loadedParts,
          root,
          loadGeneration,
        )
        if (loadGeneration !== assemblyLoadGenerationRef.current) return

        if (result.missingRefs.length > 0 && result.loadedCount < loadedParts.length) {
          if (result.loadedCount === 0) {
            const picked = await resolveAssemblyProjectDirectory({
              assemblyId: file.id,
              currentRoot: null,
              assemblySourceHandle: sourceHandle ?? null,
              promptIfMissing: true,
              startInForPrompt: sourceHandle ?? null,
            })
            if (loadGeneration !== assemblyLoadGenerationRef.current) return
            if (picked) {
              setAssemblyRootDirectoryHandle(picked)
              await applyAssemblyGeometries(file.id, loadedParts, picked, loadGeneration)
            } else {
              setProgramLoadError((current) => {
                const needFolder = i18n.t('preAssembly.loadAssembly.needProjectFolder')
                return current ? `${needFolder}\n${current}` : needFolder
              })
            }
          }
        }
      })()
    },
    [
      applyAssemblyGeometries,
      assemblyRootDirectoryHandle,
      disposeProgramPartGeometries,
      resetMatesSessionUi,
    ],
  )

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
        const root = await resolveAssemblyRootFromFileHandle(handle)
        if (root) {
          setAssemblyRootDirectoryHandle(root)
          await resolveAssemblyProjectDirectory({
            assemblyId: assemblyFile.id,
            currentRoot: root,
            assemblySourceHandle: handle,
          })
        }
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
        const root = await resolveAssemblyRootFromFileHandle(assemblySourceFileHandle)
        if (root) {
          setAssemblyRootDirectoryHandle(root)
          await resolveAssemblyProjectDirectory({
            assemblyId: assemblyFile.id,
            currentRoot: root,
            assemblySourceHandle: assemblySourceFileHandle,
          })
        }
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

  const handleSaveDocumentClick = useCallback(() => {
    if (documentSessionToolbarUi.saveTarget === 'assembly') {
      handleSaveAssemblyClick()
      return
    }
    if (documentSessionToolbarUi.saveTarget === 'part') {
      handleSavePartClick()
    }
  }, [
    documentSessionToolbarUi.saveTarget,
    handleSaveAssemblyClick,
    handleSavePartClick,
  ])

  const handleSaveAsDocumentClick = useCallback(() => {
    if (documentSessionToolbarUi.saveTarget === 'assembly') {
      handleSaveAssemblyAsClick()
      return
    }
    if (documentSessionToolbarUi.saveTarget === 'part') {
      handleSaveAsPartClick()
    }
  }, [
    documentSessionToolbarUi.saveTarget,
    handleSaveAssemblyAsClick,
    handleSaveAsPartClick,
  ])

  const revertMatePreviewIfNeeded = useCallback(
    (session: MateDraftSession): MateDraftSession => {
      if (!mateDraftHasUnsavedApply(session)) return session
      const partId = session.movingPartId
      const revert = mateDraftRevert(session)
      if (revert.ok && partId) {
        setProgramPartTransformDirect(partId, revert.transform)
      }
      return revert.ok ? revert.session : session
    },
    [setProgramPartTransformDirect],
  )

  const closeMatesPopup = useCallback(() => {
    patchMateDraftSession((session) => revertMatePreviewIfNeeded(session))
    setMatesPopupOpen(false)
    applyMatesPickSlot(null)
    setMateSolverErrorKey(null)
  }, [applyMatesPickSlot, patchMateDraftSession, revertMatePreviewIfNeeded])

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
  }, [closeMatesPopup, preAssemblyToolbarUi.createAttachmentDisabled])

  const openMatesPopupFromFacePairOrTypeFirst = useCallback(() => {
    setLimitsInstallActive(false)
    setAppearanceEditActive(false)
    setPreAssemblyWizard(null)
    setViewerContextMenu(null)
    const opened = openMateFromFacePair({
      pair: mateFacePairRef.current,
      geometries: programPartGeometriesRef.current,
    })
    commitMateDraftSession(opened.session)
    applyMatesPickSlot(opened.pickSlot)
    setMateOffsetInput('0')
    setMateSolverErrorKey(null)
    setMatesPopupOpen(true)
    if (opened.openedFromPair) {
      setMateFacePair(clearMateFacePair())
    }
  }, [applyMatesPickSlot, commitMateDraftSession])

  const handleToggleMatesPopup = useCallback(() => {
    if (matesPopupOpen) {
      closeMatesPopup()
      return
    }
    // Toolbar Constraints = type-first (pusty draft + pick A).
    setLimitsInstallActive(false)
    setAppearanceEditActive(false)
    setPreAssemblyWizard(null)
    setMateFacePair(clearMateFacePair())
    const freshSession = createMateDraftSession()
    commitMateDraftSession(freshSession)
    applyMatesPickSlot(initialMatesPickSlot(freshSession))
    setMateOffsetInput('0')
    setMateSolverErrorKey(null)
    setMatesPopupOpen(true)
  }, [applyMatesPickSlot, closeMatesPopup, commitMateDraftSession, matesPopupOpen])

  const handleAddMateFromContextMenu = useCallback(() => {
    if (programPartsRef.current.length < 2) return
    if (matesPopupOpen) {
      closeMatesPopup()
    }
    openMatesPopupFromFacePairOrTypeFirst()
  }, [closeMatesPopup, matesPopupOpen, openMatesPopupFromFacePairOrTypeFirst])

  const handleMateEntityPicked = useCallback(
    (slot: MatesPickSlot, entity: NonNullable<MateDraftSession['draft']['entityA']>) => {
      patchMateDraftSession((session) => mateDraftSetEntity(session, slot, entity))
      setMateSolverErrorKey(null)
      const next = nextMatesPickFlowStep(slot)
      applyMatesPickSlot(next === 'apply' ? null : next)
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
    () => validateParallelMateDraft(mateDraftForApply, assemblyMates),
    [mateDraftForApply, assemblyMates],
  )

  const mateValidationErrorKey = useMemo(() => {
    if (!mateDraftSession.draft.entityA || !mateDraftSession.draft.entityB) return null
    if (!Number.isFinite(parsedMateOffsetMm)) {
      return 'mates.errors.invalidOffset'
    }
    if (!mateValidation.ok) {
      if (mateValidation.reason === 'missingEntity') {
        return 'mates.errors.missingEntity'
      }
      if (mateValidation.reason === 'conflictsWithExisting') {
        return 'mates.errors.conflictsWithExisting'
      }
      return `mates.errors.${mateValidation.reason}`
    }
    return null
  }, [
    mateDraftSession.draft.entityA,
    mateDraftSession.draft.entityB,
    mateValidation,
    parsedMateOffsetMm,
  ])

  const mateDisplayErrorKey = mateSolverErrorKey ?? mateValidationErrorKey

  const canSaveMate =
    mateDraftSession.applyState === 'applied' && mateValidation.ok && Number.isFinite(parsedMateOffsetMm)

  const syncMateLivePreview = useCallback(() => {
    const session = mateDraftSessionRef.current
    if (!session.draft.entityA || !session.draft.entityB) return
    if (!mateValidation.ok || !Number.isFinite(parsedMateOffsetMm)) return

    const draft = {
      ...session.draft,
      offsetMm: parsedMateOffsetMm,
    }
    const result = executeMateApply({
      session,
      draft,
      existingMates: assemblyMatesRef.current,
      programParts: programPartsRef.current,
      programPartGeometries: programPartGeometriesRef.current,
    })
    if (!result.ok) {
      if (result.reason === 'invalidDraft' && result.validationReason) {
        setMateSolverErrorKey(`mates.errors.${result.validationReason}`)
      } else if (result.reason === 'solverFailed') {
        setMateSolverErrorKey('mates.errors.missingGeometry')
      } else if (result.reason === 'missingGeometry' || result.reason === 'missingPart') {
        setMateSolverErrorKey('mates.errors.missingGeometry')
      }
      return
    }
    setProgramPartTransformDirect(result.movingPartId, result.transform)
    commitMateDraftSession(result.nextSession)
    setMateSolverErrorKey(null)
  }, [commitMateDraftSession, mateValidation.ok, parsedMateOffsetMm, setProgramPartTransformDirect])

  useEffect(() => {
    if (!matesPopupOpen) return
    syncMateLivePreview()
  }, [
    matesPopupOpen,
    mateDraftSession.draft.entityA,
    mateDraftSession.draft.entityB,
    mateDraftSession.draft.alignment,
    parsedMateOffsetMm,
    mateValidation.ok,
    syncMateLivePreview,
  ])

  const handleMateSave = useCallback(() => {
    const saved = mateDraftSave(mateDraftSession, assemblyMates)
    if (!saved.ok) return
    commitAssemblyMates(saved.mates)
    commitMateDraftSession(saved.session)
    setMateOffsetInput('0')
    applyMatesPickSlot(null)
    setMateSolverErrorKey(null)
  }, [
    applyMatesPickSlot,
    assemblyMates,
    commitAssemblyMates,
    commitMateDraftSession,
    mateDraftSession,
  ])

  const handleMateSaveAndClose = useCallback(() => {
    const saved = mateDraftSave(mateDraftSession, assemblyMates)
    if (!saved.ok) return
    commitAssemblyMates(saved.mates)
    commitMateDraftSession(saved.session)
    setMateOffsetInput('0')
    applyMatesPickSlot(null)
    setMateSolverErrorKey(null)
    setMatesPopupOpen(false)
  }, [
    applyMatesPickSlot,
    assemblyMates,
    commitAssemblyMates,
    commitMateDraftSession,
    mateDraftSession,
  ])

  return (
    <div className={styles.app}>
      <Toolbar
        activeToolbarTab={activeToolbarTab}
        onActiveToolbarTabChange={setActiveToolbarTab}
        onLoadModelClick={handleOpenDocumentClick}
        onSaveModelClick={handleSaveDocumentClick}
        onSaveAsModelClick={handleSaveAsDocumentClick}
        hasModel={!!model}
        documentSessionToolbarUi={documentSessionToolbarUi}
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
        onCreatePhantom={handleCreatePhantom}
        onAddPart={handleAddPart}
        onCreateAttachment={handleCreateAttachment}
      />
      <input
        ref={documentOpenInputRef}
        type="file"
        accept={DOCUMENT_OPEN_FILE_ACCEPT}
        style={{ display: 'none' }}
        aria-hidden
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
          onAddPart={documentSessionToolbarUi.canAddPart ? handleAddPart : undefined}
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
            isProgramPartLocked={isProgramPartLocked}
            matesPickMode={matesPickMode}
            mateEntityHighlights={mateEntityHighlights}
            matesPickSlotRef={matesPickSlotRef}
            onMateEntityPicked={handleMateEntityPicked}
            onMateFaceClick={handleMateFaceClick}
            onViewerContextMenu={
              preAssemblyActive ? handleViewerContextMenu : undefined
            }
          />
          {viewerContextMenu && preAssemblyActive && (
            <ViewerContextMenu
              x={viewerContextMenu.x}
              y={viewerContextMenu.y}
              items={buildViewerContextMenuItems({
                canAddMate: programParts.length >= 2,
              })}
              onAction={(action) => {
                if (action === 'addMate') {
                  handleAddMateFromContextMenu()
                }
              }}
              onClose={() => setViewerContextMenu(null)}
            />
          )}
          <DocumentTreeOverlay
            mainModel={model}
            mainFileName={sourceFileName}
            mainFaceConstraints={preparedFaceConstraints}
            mainModelElements={preparedConstraints.modelElements ?? []}
            assemblyName={assemblyDocMeta.name}
            programParts={programParts}
            programPartGeometries={programPartGeometries}
            programPartConstraints={programPartConstraints}
            assemblyMates={assemblyMates}
            activeProgramPartId={activeProgramPartId}
            partLocks={partLockedById}
            onActivePartChange={handleActiveProgramPartChange}
            onTogglePartLock={handleTogglePartLock}
            onRemovePart={handleRemoveProgramPart}
            onEditAppearance={handleDocumentTreeEditAppearance}
            onTreeMateHighlightsChange={setTreeMateHighlights}
            onHighlightElementFaces={handleDocumentTreeHighlightElementFaces}
            onDeleteMate={handleDeleteAssemblyMate}
            onToggleMateSuppressed={handleToggleMateSuppressed}
            onApplySizeEdit={handleDocumentTreeApplySizeEdit}
            onRemoveSizeLimit={handleDocumentTreeRemoveSizeLimit}
            onRenameSize={handleDocumentTreeRenameSize}
            onRenamePart={handleDocumentTreeRenamePart}
            onAddCustomSize={handleDocumentTreeAddCustomSize}
            selectionClearEpoch={viewportSelectionClearEpoch}
            geometryRevision={geometryRevision}
          />
        </div>
        {matesPopupOpen && (
          <MatesPopup
            session={mateDraftSession}
            activePickSlot={matesPickSlot}
            offsetInput={mateOffsetInput}
            partNameById={programPartNameById}
            solverErrorKey={mateDisplayErrorKey}
            canSave={canSaveMate}
            onAlignmentChange={(alignment) => {
              patchMateDraftSession((session) => mateDraftUpdateDraft(session, { alignment }))
            }}
            onOffsetChange={setMateOffsetInput}
            onStartPick={(slot) => {
              applyMatesPickSlot(toggleMatesPickSlot(matesPickSlotRef.current, slot))
              setMateSolverErrorKey(null)
            }}
            onSave={handleMateSave}
            onSaveAndClose={handleMateSaveAndClose}
            onClose={closeMatesPopup}
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
          appearance={
            editingProgramPartId
              ? (programPartAppearances[editingProgramPartId] ?? DEFAULT_MODEL_APPEARANCE)
              : modelAppearance
          }
          onAppearanceChange={handleViewportAppearanceChange}
          limitsInstallConstraintType={limitsInstallConstraintType}
          onLimitsInstallConstraintTypeChange={setLimitsInstallConstraintType}
          preparedModelElements={viewportPreparedModelElements}
          onApplyTwoFaceStretch={handleViewportApplyTwoFaceStretch}
          faceConstraints={viewportFaceConstraints}
          onFaceConstraintsChange={handleViewportFaceConstraintsChange}
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
