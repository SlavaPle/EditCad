import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BufferGeometry } from 'three'
import { useTranslation } from 'react-i18next'
import { analyzeTwoFaceStretch } from '../lib/twoFaceStretch'
import type { ApplyTwoFaceStretchOverlay } from '../lib/applyStretchOverlay'
import { partitionSelectionIntoCoplanarPatches } from '../features/model-selection/facePlaneSelection'
import {
  getSelectionPanelListEntries,
  mergeFaceSelectionWithProbable,
  selectionSupportsTwoFaceStretchProximity,
  type SelectionState,
} from '../lib/selection'
import { captureFrozenPlanePairFromTriangles } from '../features/model-selection/frozenPlanePairCapture'
import { parseMinMaxBoundsForm } from '../lib/minMaxBoundsForm'
import {
  panelAxisBoundsFromMinMaxForm,
  panelAxisBoundsFromParsed,
} from '../lib/panelAxisBoundsFromMinMaxForm'
import {
  applyTargetDistanceFromInput,
  type ApplyTwoFaceStretchFn,
} from '../lib/applyTargetDistanceFromInput'
import { parsePositiveMm } from '../lib/parsePositiveMm'
import type { PreparedModelElement } from '../lib/preparedElementFormat'
import {
  findMatchingPanelThicknessConstraint,
  findMatchingProfilStretchConstraint,
} from '../features/part-constraints/findMatchingPartConstraintDimensions'
import { MIN_STRETCH_GAP_FLOOR_MM } from '../features/part-constraints/stretchBasicEnvelopeForMergedPair'
import { mergedFacesMatchConstraintStretchPair } from '../features/part-constraints/matchesConstraintStretchPair'
import {
  stretchBasicEnvelopeForMergedPair,
  stretchInputDeviationKind,
} from '../features/part-constraints/stretchBasicEnvelopeForMergedPair'
import {
  arePanelSpanPreparedPairIdsDistinct,
  type FaceConstraint,
  type FaceConstraintType,
  type PanelAxisBounds,
} from '../features/face-constraints/model'
import { checkConstraintCanBeAddedByDimensionSlots } from '../features/face-constraints/limitDimensionSlots'
import { formatConstraintUiSummary } from '../features/face-constraints/formatConstraintUiSummary'
import {
  buildPanelInstallBundle,
  isPanelInstallBundleFailure,
  removePanelAndAuxiliaryConstraints,
} from '../features/face-constraints/panelInstallBundle'
import {
  buildProfilInstallBundle,
  isProfilInstallBundleFailure,
  removeProfilAndAuxiliaryConstraints,
} from '../features/face-constraints/profilInstallBundle'
import { removeBlockAndAuxiliaryConstraints } from '../features/face-constraints/blockInstallBundle'
import { removeFaceConstraint, upsertFaceConstraint } from '../features/face-constraints/store'
import { getLimitsInstallActivePairPanelUi } from './limitsInstallPanelUi'
import { PanelAxisMinMaxFields } from './PanelAxisMinMaxFields'
import { EditAppearanceControls } from './EditAppearanceControls'
import type { ModelAppearance } from '../features/viewer-display/modelAppearance'
import styles from './RightPanel.module.css'

export interface RightPanelProps {
  selection: SelectionState
  probableFaces?: readonly number[]
  model: BufferGeometry | null
  geometryRevision: number
  constraintsLocked: boolean
  /** Aktywny przycisk „Limits” na zakładce Edit — pokazuje formularz na panelu */
  limitsInstallActive: boolean
  /** Aktywny przycisk wyglądu na zakładce Edit — formularz na panelu */
  appearanceEditActive: boolean
  appearance: ModelAppearance
  onAppearanceChange: (next: ModelAppearance) => void
  limitsInstallConstraintType: FaceConstraintType
  onLimitsInstallConstraintTypeChange: (next: FaceConstraintType) => void
  preparedModelElements: readonly PreparedModelElement[]
  onApplyTwoFaceStretch: ApplyTwoFaceStretchFn
  faceConstraints: FaceConstraint[]
  onFaceConstraintsChange: (next: FaceConstraint[]) => void
  onMergeModelElements: (elements: readonly PreparedModelElement[]) => void
  /** Po zatwierdzeniu zamrożonej pary: przywróć zaznaczenie pary rozciągania (PROFIL). */
  onRestoreFaceSelection?: (faceTriangleIndices: readonly number[]) => void
  /** Jednorazowy tryb Limits: po udanym dodaniu wyłącz tryb. */
  onLimitsInstallDone?: () => void
}

function naiveStretchMmAfterAddingMinMax(
  currentGapMm: number,
  minMm: number,
  maxMm: number,
): number {
  return Math.min(Math.max(currentGapMm, minMm), maxMm)
}

function mapDimensionSlotError(reason: 'fullConstraintExists' | 'slotAlreadyOccupied' | 'needTwoPlanarGroups'): string {
  if (reason === 'slotAlreadyOccupied') return 'dimensionSlotOccupied'
  if (reason === 'needTwoPlanarGroups') return 'needTwoPlanarGroups'
  return 'dimensionFullOccupied'
}

export function RightPanel({
  selection,
  probableFaces = [],
  model,
  geometryRevision,
  constraintsLocked,
  limitsInstallActive,
  appearanceEditActive,
  appearance,
  onAppearanceChange,
  limitsInstallConstraintType,
  onLimitsInstallConstraintTypeChange,
  preparedModelElements,
  onApplyTwoFaceStretch,
  faceConstraints,
  onFaceConstraintsChange,
  onMergeModelElements,
  onRestoreFaceSelection,
  onLimitsInstallDone,
}: RightPanelProps) {
  const { t, i18n } = useTranslation()
  const rows = useMemo(
    () => getSelectionPanelListEntries(selection, model, probableFaces),
    [selection, model, geometryRevision, probableFaces],
  )

  const facesForStretch = useMemo(
    () => mergeFaceSelectionWithProbable(selection.faces, probableFaces),
    [selection.faces, probableFaces],
  )

  const faceStretchSelection = selectionSupportsTwoFaceStretchProximity(selection, probableFaces)

  const analysis = useMemo(() => {
    if (!model || !faceStretchSelection) return null
    return analyzeTwoFaceStretch(model, facesForStretch)
  }, [model, geometryRevision, facesForStretch, faceStretchSelection])

  const constStretchNominalMm = useMemo(() => {
    if (!constraintsLocked || !model || !faceStretchSelection) return null
    for (const c of faceConstraints) {
      if (c.type !== 'const' || c.edgeVertexPair) continue
      if (!mergedFacesMatchConstraintStretchPair(model, facesForStretch, preparedModelElements, c))
        continue
      return c.valueMm > 0 && Number.isFinite(c.valueMm) ? c.valueMm : null
    }
    return null
  }, [
    constraintsLocked,
    model,
    faceStretchSelection,
    facesForStretch,
    faceConstraints,
    preparedModelElements,
    geometryRevision,
  ])

  const [targetInput, setTargetInput] = useState('')
  const [applyError, setApplyError] = useState<string | null>(null)
  const [panelSpanApplyError, setPanelSpanApplyError] = useState<string | null>(null)
  const constraintType = limitsInstallConstraintType
  const prevConstraintTypeRef = useRef(constraintType)
  const [boundsUseMin, setBoundsUseMin] = useState(false)
  const [boundsMinMmInput, setBoundsMinMmInput] = useState('')
  const [boundsMaxMmInput, setBoundsMaxMmInput] = useState('')
  const [constraintValue, setConstraintValue] = useState('')
  const [panelXUseMin, setPanelXUseMin] = useState(false)
  const [panelXMin, setPanelXMin] = useState('')
  const [panelXMax, setPanelXMax] = useState('')
  const [panelYSameAsX, setPanelYSameAsX] = useState(false)
  const [panelYUseMin, setPanelYUseMin] = useState(false)
  const [panelYMin, setPanelYMin] = useState('')
  const [panelYMax, setPanelYMax] = useState('')
  /** Zablokowana lista trójkątów dla grubości panelu — nie podąża za bieżącym zaznaczeniem po zapisie. */
  const [frozenThicknessFaces, setFrozenThicknessFaces] = useState<number[] | null>(null)
  const [panelCapturedPairX, setPanelCapturedPairX] = useState<{ a: string; b: string } | null>(null)
  const [panelCapturedPairY, setPanelCapturedPairY] = useState<{ a: string; b: string } | null>(null)
  const [panelSpanPickArm, setPanelSpanPickArm] = useState<null | 'x' | 'y'>(null)
  /** Przywracanie zaznaczenia pary grubości po zatwierdzeniu pary X/Y (jak PROFIL). */
  const [panelThicknessTrianglesSnapshot, setPanelThicknessTrianglesSnapshot] = useState<number[] | null>(null)
  const [panelThicknessMmInput, setPanelThicknessMmInput] = useState('')
  const [constraintError, setConstraintError] = useState<string | null>(null)
  const [profilFrozenSlot1Ids, setProfilFrozenSlot1Ids] = useState<{ a: string; b: string } | null>(null)
  const [profilFrozenSlot2Ids, setProfilFrozenSlot2Ids] = useState<{ a: string; b: string } | null>(null)
  /** Zapis pary rozciągania z momentu pierwszego „Select frozen 1”; add PROFIL używa tego zamiast bieżącego zaznaczenia. */
  const [profilStretchTrianglesSnapshot, setProfilStretchTrianglesSnapshot] = useState<number[] | null>(null)
  const [profilFrozenPickArm, setProfilFrozenPickArm] = useState<null | 1 | 2>(null)
  const [profilStretchUseMin, setProfilStretchUseMin] = useState(false)
  const [profilStretchMinMm, setProfilStretchMinMm] = useState('')

  const stretchEnvelope = useMemo(() => {
    if (!constraintsLocked || !model || !faceStretchSelection) return null
    return stretchBasicEnvelopeForMergedPair(
      model,
      facesForStretch,
      faceConstraints,
      preparedModelElements,
    )
  }, [
    constraintsLocked,
    model,
    faceStretchSelection,
    facesForStretch,
    faceConstraints,
    preparedModelElements,
    geometryRevision,
  ])

  const matchingPanelThicknessConstraint = useMemo(() => {
    if (!model || !faceStretchSelection) return null
    return findMatchingPanelThicknessConstraint(model, facesForStretch, faceConstraints)
  }, [model, geometryRevision, facesForStretch, faceStretchSelection, faceConstraints])

  const matchingProfilStretchConstraint = useMemo(() => {
    if (!model || !faceStretchSelection || matchingPanelThicknessConstraint) return null
    return findMatchingProfilStretchConstraint(
      model,
      facesForStretch,
      faceConstraints,
      preparedModelElements,
    )
  }, [
    model,
    geometryRevision,
    facesForStretch,
    faceStretchSelection,
    faceConstraints,
    preparedModelElements,
    matchingPanelThicknessConstraint,
  ])

  // panelThicknessInvariantTriangles is only used when editing PANEL spans; kept for future extensions

  const stretchDistanceBoundHint = useMemo(() => {
    if (!stretchEnvelope || stretchEnvelope.matchedConstraintCount === 0) return null
    const mm = parsePositiveMm(targetInput)
    if (mm === null) return null
    const kind = stretchInputDeviationKind(mm, stretchEnvelope)
    return kind === null ? null : { kind, envelope: stretchEnvelope }
  }, [targetInput, stretchEnvelope])

  const profilStretchGapBandMm = useMemo(() => {
    if (!constraintsLocked || !matchingProfilStretchConstraint) return null
    const c = matchingProfilStretchConstraint
    const upper = c.valueMm
    const lower =
      typeof c.stretchMinMm === 'number' &&
      Number.isFinite(c.stretchMinMm) &&
      c.stretchMinMm > 0
        ? c.stretchMinMm
        : MIN_STRETCH_GAP_FLOOR_MM
    if (!(upper > 0 && Number.isFinite(upper))) return null
    if (lower > upper + 1e-4) return null
    return { lower, upper }
  }, [constraintsLocked, matchingProfilStretchConstraint])

  const profilStretchBoundHintKey = useMemo(() => {
    if (!profilStretchGapBandMm) return null
    const mm = parsePositiveMm(targetInput)
    if (mm === null) return null
    if (mm < profilStretchGapBandMm.lower - 1e-4) return 'belowStretchMin' as const
    if (mm > profilStretchGapBandMm.upper + 1e-4) return 'aboveStretchMax' as const
    return null
  }, [targetInput, profilStretchGapBandMm])

  useEffect(() => {
    setApplyError(null)
    setConstraintError(null)
    setPanelSpanApplyError(null)
  }, [selection, geometryRevision])

  useEffect(() => {
    if (constraintType !== 'profil') {
      setProfilFrozenSlot1Ids(null)
      setProfilFrozenSlot2Ids(null)
      setProfilStretchUseMin(false)
      setProfilStretchMinMm('')
      setProfilStretchTrianglesSnapshot(null)
      setProfilFrozenPickArm(null)
    }
  }, [constraintType])

  useEffect(() => {
    if (constraintType !== 'minmax') {
      setBoundsUseMin(false)
      setBoundsMinMmInput('')
    }
  }, [constraintType])

  useEffect(() => {
    const prev = prevConstraintTypeRef.current
    if (constraintType !== 'panel') {
      setFrozenThicknessFaces(null)
      setPanelCapturedPairX(null)
      setPanelCapturedPairY(null)
      setPanelSpanPickArm(null)
      setPanelThicknessTrianglesSnapshot(null)
    } else if (prev !== 'panel') {
      setFrozenThicknessFaces(null)
      setPanelCapturedPairX(null)
      setPanelCapturedPairY(null)
      setPanelSpanPickArm(null)
      setPanelThicknessTrianglesSnapshot(null)
    }
    prevConstraintTypeRef.current = constraintType
  }, [constraintType])

  useEffect(() => {
    if (constraintType !== 'panel') return
    if (frozenThicknessFaces !== null) return
    if (!analysis?.ok || !faceStretchSelection) return
    setFrozenThicknessFaces([...facesForStretch])
  }, [constraintType, analysis, faceStretchSelection, facesForStretch, frozenThicknessFaces])

  useEffect(() => {
    if (!analysis || !analysis.ok) {
      return
    }
    if (constStretchNominalMm !== null) {
      setTargetInput(String(Number(constStretchNominalMm.toFixed(6))))
      return
    }
    setTargetInput(String(Number(analysis.gapMm.toFixed(6))))
  }, [analysis, constStretchNominalMm])

  const handleApply = useCallback(() => {
    const result = applyTargetDistanceFromInput(targetInput, onApplyTwoFaceStretch)
    if (!result.ok) {
      setApplyError(result.error)
      return
    }
    setApplyError(null)
  }, [onApplyTwoFaceStretch, targetInput])

  // spanX/Y helpers and handleApplyPanelSpan are no longer used in simplified Distance UI

  const facePair =
    facesForStretch.length >= 2 ? { a: Math.min(facesForStretch[0], facesForStretch[1]), b: Math.max(facesForStretch[0], facesForStretch[1]) } : null

  const lockedThicknessAnalysis = useMemo(() => {
    if (!model || !frozenThicknessFaces?.length) return null
    return analyzeTwoFaceStretch(model, frozenThicknessFaces)
  }, [model, geometryRevision, frozenThicknessFaces])

  const panelThicknessPairReady = lockedThicknessAnalysis?.ok === true && Boolean(frozenThicknessFaces?.length)

  const lockedPanelThicknessMm =
    lockedThicknessAnalysis?.ok === true ? Number(lockedThicknessAnalysis.gapMm.toFixed(6)) : null

  useEffect(() => {
    if (constraintType !== 'panel') {
      setPanelThicknessMmInput('')
      return
    }
    if (!panelThicknessPairReady || lockedPanelThicknessMm === null) return
    setPanelThicknessMmInput((prev) => (prev.trim() === '' ? String(lockedPanelThicknessMm) : prev))
  }, [constraintType, panelThicknessPairReady, lockedPanelThicknessMm, frozenThicknessFaces])

  const cancelProfilFrozenPick = useCallback(() => {
    setConstraintError(null)
    setProfilFrozenPickArm(null)
  }, [])

  const handleProfilFrozenSlotPress = useCallback(
    (which: 1 | 2) => {
      setConstraintError(null)
      if (!model) {
        setConstraintError('needTwoFaces')
        return
      }
      if (profilFrozenPickArm !== null && profilFrozenPickArm !== which) {
        setConstraintError('profilFinishOrCancelFrozenPick')
        return
      }
      if (profilFrozenPickArm === which) {
        const captured = captureFrozenPlanePairFromTriangles(model, facesForStretch, {
          idPrefix: 'prz',
          slotTag: which === 1 ? 'fz1' : 'fz2',
        })
        if (!captured.ok) {
          setConstraintError('needTwoPlanarGroups')
          return
        }
        onMergeModelElements([...captured.elements])
        const pair = { a: captured.elementAId, b: captured.elementBId }
        if (which === 1) setProfilFrozenSlot1Ids(pair)
        else setProfilFrozenSlot2Ids(pair)
        setProfilFrozenPickArm(null)
        const snap = profilStretchTrianglesSnapshot
        if (snap?.length && onRestoreFaceSelection) {
          onRestoreFaceSelection(snap)
        }
        return
      }
      if (which === 2 && !profilFrozenSlot1Ids) {
        setConstraintError('needProfilFrozen1First')
        return
      }
      if (which === 1 && profilStretchTrianglesSnapshot === null) {
        if (!faceStretchSelection || !analysis?.ok) {
          setConstraintError('needTwoPlanarGroups')
          return
        }
        setProfilStretchTrianglesSnapshot([...facesForStretch])
      } else if (which === 2 && profilStretchTrianglesSnapshot === null) {
        setConstraintError('needProfilFrozen1First')
        return
      }
      setProfilFrozenPickArm(which)
    },
    [
      analysis,
      faceStretchSelection,
      facesForStretch,
      model,
      onMergeModelElements,
      onRestoreFaceSelection,
      profilFrozenPickArm,
      profilFrozenSlot1Ids,
      profilStretchTrianglesSnapshot,
    ],
  )

  const cancelPanelSpanPick = useCallback(() => {
    setConstraintError(null)
    setPanelSpanPickArm(null)
    setPanelThicknessTrianglesSnapshot(null)
  }, [])

  const handlePanelAxisPairPress = useCallback(
    (axis: 'x' | 'y') => {
      setConstraintError(null)
      if (!model) {
        setConstraintError('needTwoFaces')
        return
      }
      if (panelSpanPickArm !== null && panelSpanPickArm !== axis) {
        setConstraintError('panelFinishOrCancelSpanPick')
        return
      }
      if (!panelThicknessPairReady || parsePositiveMm(panelThicknessMmInput) === null) {
        setConstraintError('needPanelThickness')
        return
      }
      if (panelSpanPickArm === axis) {
        const c = captureFrozenPlanePairFromTriangles(model, facesForStretch, {
          idPrefix: 'pel',
          slotTag: axis,
        })
        if (!c.ok) {
          setConstraintError('needTwoPlanarGroups')
          return
        }
        onMergeModelElements([...c.elements])
        const pair = { a: c.elementAId, b: c.elementBId }
        if (axis === 'x') setPanelCapturedPairX(pair)
        else setPanelCapturedPairY(pair)
        setPanelSpanPickArm(null)
        const snap = panelThicknessTrianglesSnapshot
        setPanelThicknessTrianglesSnapshot(null)
        if (snap?.length && onRestoreFaceSelection) {
          onRestoreFaceSelection(snap)
        }
        return
      }
      if (panelThicknessTrianglesSnapshot === null && frozenThicknessFaces) {
        setPanelThicknessTrianglesSnapshot([...frozenThicknessFaces])
      }
      setPanelSpanPickArm(axis)
    },
    [
      facesForStretch,
      frozenThicknessFaces,
      panelThicknessPairReady,
      panelThicknessMmInput,
      model,
      onMergeModelElements,
      onRestoreFaceSelection,
      panelSpanPickArm,
      panelThicknessTrianglesSnapshot,
    ],
  )

  const handleAddConstraint = useCallback(() => {
    const id = `${constraintType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setConstraintError(null)

    if (constraintType === 'block') {
      if (faceConstraints.length > 0) {
        setConstraintError('dimensionFullOccupied')
        return
      }
      const next: FaceConstraint = { id, type: 'block', facePair: null }
      onFaceConstraintsChange(upsertFaceConstraint(faceConstraints, next))
      onLimitsInstallDone?.()
      return
    }

    if (constraintType === 'panel') {
      if (!model) {
        setConstraintError('needTwoFaces')
        return
      }
      const panelCheck = checkConstraintCanBeAddedByDimensionSlots({
        geometry: model,
        modelElements: preparedModelElements,
        existing: faceConstraints,
        nextType: 'panel',
      })
      if (!panelCheck.ok) {
        setConstraintError(mapDimensionSlotError(panelCheck.reason))
        return
      }
      if (panelSpanPickArm !== null) {
        setConstraintError('panelFinishOrCancelSpanPick')
        return
      }
      const thicknessMm = parsePositiveMm(panelThicknessMmInput)
      if (!panelThicknessPairReady || thicknessMm === null) {
        setConstraintError('needPanelThickness')
        return
      }
      if (!panelCapturedPairX) {
        setConstraintError('needPanelCapturedX')
        return
      }
      if (!panelCapturedPairY) {
        setConstraintError('needPanelCapturedY')
        return
      }
      if (
        !arePanelSpanPreparedPairIdsDistinct(
          panelCapturedPairX.a,
          panelCapturedPairX.b,
          panelCapturedPairY.a,
          panelCapturedPairY.b,
        )
      ) {
        setConstraintError('needPanelDistinctXYPairs')
        return
      }
      const panelXParsed = panelAxisBoundsFromMinMaxForm({
        useMinBound: panelXUseMin,
        minMmInput: panelXMin,
        maxMmInput: panelXMax,
      })
      if (!panelXParsed.ok) {
        setConstraintError(panelXParsed.reason === 'invalidRange' ? 'invalidRange' : 'invalidValue')
        return
      }
      const panelXBounds = panelAxisBoundsFromParsed(panelXParsed)

      let panelYBounds: PanelAxisBounds
      let ySameAsX = false
      if (panelYSameAsX) {
        ySameAsX = true
        panelYBounds =
          panelXBounds.minMm === undefined
            ? { maxMm: panelXBounds.maxMm }
            : { maxMm: panelXBounds.maxMm, minMm: panelXBounds.minMm }
      } else {
        const panelYParsed = panelAxisBoundsFromMinMaxForm({
          useMinBound: panelYUseMin,
          minMmInput: panelYMin,
          maxMmInput: panelYMax,
        })
        if (!panelYParsed.ok) {
          setConstraintError(panelYParsed.reason === 'invalidRange' ? 'invalidRange' : 'invalidValue')
          return
        }
        panelYBounds = panelAxisBoundsFromParsed(panelYParsed)
      }

      const xa = panelCapturedPairX.a
      const xb = panelCapturedPairX.b
      const ya = panelCapturedPairY.a
      const yb = panelCapturedPairY.b
      const bundle = buildPanelInstallBundle({
        geometry: model,
        panelId: id,
        thicknessMm,
        thicknessTriangles: frozenThicknessFaces!,
        panelXBounds,
        panelYBounds,
        ySameAsX,
        panelXElementAId: xa,
        panelXElementBId: xb,
        panelYElementAId: ya,
        panelYElementBId: yb,
        preparedModelElements,
      })
      if (isPanelInstallBundleFailure(bundle)) {
        setConstraintError(
          bundle.reason === 'missingSpanElements' ? 'needPanelCapturedX' : 'needTwoPlanarGroups',
        )
        return
      }
      let nextList = faceConstraints
      for (const aux of bundle.auxiliaryConstraints) {
        nextList = upsertFaceConstraint(nextList, aux)
      }
      nextList = upsertFaceConstraint(nextList, bundle.panel)
      const allElements = [...preparedModelElements, ...bundle.extraElements]
      for (const step of bundle.stretchSteps) {
        const stretchRes = onApplyTwoFaceStretch(step.targetMm, {
          mergedFaces: [...step.mergedFaces],
          faceConstraints: nextList,
          modelElements: allElements,
          forceConstraintEvaluation: true,
          ...(step.panelThicknessMergedFaces
            ? { panelThicknessMergedFaces: [...step.panelThicknessMergedFaces] }
            : {}),
        })
        if (!stretchRes.ok) {
          setConstraintError(stretchRes.error)
          return
        }
      }
      onMergeModelElements(bundle.extraElements)
      onFaceConstraintsChange(nextList)
      onLimitsInstallDone?.()
      return
    }

    if (constraintType === 'profil') {
      if (!model) {
        setConstraintError('needTwoFaces')
        return
      }
      const profilCheck = checkConstraintCanBeAddedByDimensionSlots({
        geometry: model,
        modelElements: preparedModelElements,
        existing: faceConstraints,
        nextType: 'profil',
      })
      if (!profilCheck.ok) {
        setConstraintError(mapDimensionSlotError(profilCheck.reason))
        return
      }
      if (profilFrozenPickArm !== null) {
        setConstraintError('profilFinishOrCancelFrozenPick')
        return
      }
      const stretchPick = profilStretchTrianglesSnapshot
      if (!stretchPick?.length) {
        setConstraintError('needProfilStretchLocked')
        return
      }
      if (!profilFrozenSlot1Ids || !profilFrozenSlot2Ids) {
        setConstraintError('needProfilFrozenDims')
        return
      }
      const valueMm = parsePositiveMm(constraintValue)
      if (valueMm === null) {
        setConstraintError('invalidValue')
        return
      }
      let stretchMinMm: number | undefined
      if (profilStretchUseMin) {
        const minMm = parsePositiveMm(profilStretchMinMm)
        if (minMm === null) {
          setConstraintError('invalidValue')
          return
        }
        if (minMm > valueMm) {
          setConstraintError('invalidRange')
          return
        }
        stretchMinMm = minMm
      }
      const bundle = buildProfilInstallBundle({
        geometry: model,
        profilId: id,
        stretchTriangles: stretchPick,
        stretchMaxMm: valueMm,
        stretchMinMm,
        frozen1ElementAId: profilFrozenSlot1Ids.a,
        frozen1ElementBId: profilFrozenSlot1Ids.b,
        frozen2ElementAId: profilFrozenSlot2Ids.a,
        frozen2ElementBId: profilFrozenSlot2Ids.b,
        preparedModelElements,
      })
      if (isProfilInstallBundleFailure(bundle)) {
        const reason =
          bundle.reason === 'missingFrozenElements'
            ? 'needProfilFrozenDims'
            : bundle.reason === 'invalidFrozenGap'
              ? 'invalidValue'
              : 'needTwoPlanarGroups'
        setConstraintError(reason)
        return
      }
      let nextList = faceConstraints
      for (const aux of bundle.auxiliaryConstraints) {
        nextList = upsertFaceConstraint(nextList, aux)
      }
      nextList = upsertFaceConstraint(nextList, bundle.profil)
      const allElements = [...preparedModelElements, ...bundle.extraElements]
      for (const step of bundle.stretchSteps) {
        const stretchRes = onApplyTwoFaceStretch(step.targetMm, {
          mergedFaces: [...step.mergedFaces],
          faceConstraints: nextList,
          modelElements: allElements,
          forceConstraintEvaluation: true,
        })
        if (!stretchRes.ok) {
          setConstraintError(stretchRes.error)
          return
        }
      }
      onMergeModelElements(bundle.extraElements)
      onFaceConstraintsChange(nextList)
      onLimitsInstallDone?.()
      return
    }

    if (constraintType === 'minmax') {
      if (!facePair || !model) {
        setConstraintError('needTwoFaces')
        return
      }
      const boundsParsed = parseMinMaxBoundsForm({
        useMinBound: boundsUseMin,
        minMmInput: boundsMinMmInput,
        maxMmInput: boundsMaxMmInput,
      })
      if (!boundsParsed.ok) {
        setConstraintError(boundsParsed.reason === 'invalidRange' ? 'invalidRange' : 'invalidValue')
        return
      }
      const { minMm, maxMm } = boundsParsed
      const patchesMx = partitionSelectionIntoCoplanarPatches(model, facesForStretch)
      if (patchesMx.length !== 2) {
        setConstraintError('needTwoPlanarGroups')
        return
      }
      const minMaxCheck = checkConstraintCanBeAddedByDimensionSlots({
        geometry: model,
        modelElements: preparedModelElements,
        existing: faceConstraints,
        nextType: 'minmax',
        nextMergedFaces: facesForStretch,
      })
      if (!minMaxCheck.ok) {
        setConstraintError(mapDimensionSlotError(minMaxCheck.reason))
        return
      }
      const pidMx = Date.now()
      const randMx = Math.random().toString(36).slice(2, 6)
      const elementAIdMx = `el-${pidMx}-${randMx}-a`
      const elementBIdMx = `el-${pidMx}-${randMx}-b`
      const uaMx = [...patchesMx[0]!]
      const ubMx = [...patchesMx[1]!]
      uaMx.sort((x, y) => x - y)
      ubMx.sort((x, y) => x - y)
      const repAMx = uaMx[0]!
      const repBMx = ubMx[0]!
      const nextMx: FaceConstraint = {
        id,
        type: 'minmax',
        facePair: { a: repAMx, b: repBMx },
        elementAId: elementAIdMx,
        elementBId: elementBIdMx,
        minMm,
        maxMm,
      }
      const nextListMx = upsertFaceConstraint(faceConstraints, nextMx)
      const extraElsMx = [
        { id: elementAIdMx, faceIndices: uaMx },
        { id: elementBIdMx, faceIndices: ubMx },
      ]
      const gapAnMx = analyzeTwoFaceStretch(model, facesForStretch)
      if (!gapAnMx.ok) {
        setConstraintError('needTwoPlanarGroups')
        return
      }
      const rawMmMx = naiveStretchMmAfterAddingMinMax(gapAnMx.gapMm, minMm, maxMm)
      const stretchResMx = onApplyTwoFaceStretch(rawMmMx, {
        mergedFaces: [...facesForStretch],
        faceConstraints: nextListMx,
        modelElements: [...preparedModelElements, ...extraElsMx],
        forceConstraintEvaluation: true,
      })
      if (!stretchResMx.ok) {
        setConstraintError(stretchResMx.error)
        return
      }
      onMergeModelElements(extraElsMx)
      onFaceConstraintsChange(nextListMx)
      setTargetInput(String(Number(stretchResMx.effectiveTargetMm.toFixed(6))))
      onLimitsInstallDone?.()
      return
    }

    if (constraintType !== 'const') {
      return
    }

    if (!facePair || !model) {
      setConstraintError('needTwoFaces')
      return
    }
    const valueMm = parsePositiveMm(constraintValue)
    if (valueMm === null) {
      setConstraintError('invalidValue')
      return
    }
    const patches = partitionSelectionIntoCoplanarPatches(model, facesForStretch)
    if (patches.length !== 2) {
      setConstraintError('needTwoPlanarGroups')
      return
    }
    const constCheck = checkConstraintCanBeAddedByDimensionSlots({
      geometry: model,
      modelElements: preparedModelElements,
      existing: faceConstraints,
      nextType: 'const',
      nextMergedFaces: facesForStretch,
    })
    if (!constCheck.ok) {
      setConstraintError(mapDimensionSlotError(constCheck.reason))
      return
    }
    const pid = Date.now()
    const rand = Math.random().toString(36).slice(2, 6)
    const elementAId = `el-${pid}-${rand}-a`
    const elementBId = `el-${pid}-${rand}-b`
    const ua = [...patches[0]!]
    const ub = [...patches[1]!]
    ua.sort((x, y) => x - y)
    ub.sort((x, y) => x - y)
    const repA = ua[0]!
    const repB = ub[0]!
    const next: FaceConstraint = {
      id,
      type: 'const',
      facePair: { a: repA, b: repB },
      elementAId,
      elementBId,
      valueMm,
    }
    const nextList = upsertFaceConstraint(faceConstraints, next)
    const extraEls = [
      { id: elementAId, faceIndices: ua },
      { id: elementBId, faceIndices: ub },
    ]
    const gapAn = analyzeTwoFaceStretch(model, facesForStretch)
    if (!gapAn.ok) {
      setConstraintError('needTwoPlanarGroups')
      return
    }
    const rawMm = valueMm
    const stretchRes = onApplyTwoFaceStretch(rawMm, {
      mergedFaces: [...facesForStretch],
      faceConstraints: nextList,
      modelElements: [...preparedModelElements, ...extraEls],
      forceConstraintEvaluation: true,
    })
    if (!stretchRes.ok) {
      setConstraintError(stretchRes.error)
      return
    }
    onMergeModelElements(extraEls)
    onFaceConstraintsChange(nextList)
    setTargetInput(String(Number(stretchRes.effectiveTargetMm.toFixed(6))))
    onLimitsInstallDone?.()
  }, [
    constraintType,
    constraintValue,
    boundsUseMin,
    boundsMinMmInput,
    boundsMaxMmInput,
    faceConstraints,
    facePair,
    facesForStretch,
    model,
    preparedModelElements,
    onApplyTwoFaceStretch,
    onFaceConstraintsChange,
    onMergeModelElements,
    panelCapturedPairX,
    panelCapturedPairY,
    panelSpanPickArm,
    panelThicknessMmInput,
    panelThicknessPairReady,
    panelXMax,
    panelXMin,
    panelXUseMin,
    panelYMax,
    panelYMin,
    panelYSameAsX,
    panelYUseMin,
    profilFrozenPickArm,
    profilFrozenSlot1Ids,
    profilFrozenSlot2Ids,
    profilStretchTrianglesSnapshot,
    profilStretchUseMin,
    profilStretchMinMm,
  ])

  const handleRemoveConstraint = useCallback(
    (id: string) => {
      const target = faceConstraints.find((c) => c.id === id)
      let next = faceConstraints
      if (target?.type === 'panel') {
        next = removePanelAndAuxiliaryConstraints(faceConstraints, id)
      } else if (target?.type === 'profil') {
        next = removeProfilAndAuxiliaryConstraints(faceConstraints, id)
      } else if (target?.type === 'block') {
        next = removeBlockAndAuxiliaryConstraints(faceConstraints, id)
      } else {
        next = removeFaceConstraint(faceConstraints, id)
      }
      onFaceConstraintsChange(next)
    },
    [faceConstraints, onFaceConstraintsChange],
  )

  const constraintAddErrorText =
    constraintError === null
      ? null
      : i18n.exists(`rightPanel.limits.errors.${constraintError}`)
        ? t(`rightPanel.limits.errors.${constraintError}`)
        : t(`rightPanel.faceDistance.errors.${constraintError}`)

  const limitsActivePairPanel = getLimitsInstallActivePairPanelUi({
    hasModel: model !== null,
    limitsInstallActive,
    faceStretchSelection,
    limitsInstallConstraintType: constraintType,
  })

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>{t('rightPanel.header')}</div>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('rightPanel.picking.title')}</div>
          <p className={styles.selectionHint}>{t('rightPanel.picking.hint')}</p>
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('rightPanel.selectionList.title')}</div>
          {rows.length === 0 ? (
            <p className={styles.selectionListEmpty}>{t('rightPanel.selectionList.empty')}</p>
          ) : (
            <ul className={styles.selectionList}>
              {rows.map((row, i) => {
                const key =
                  row.kind === 'vertex'
                    ? `v-${row.index}-${i}`
                    : row.kind === 'edge'
                      ? `e-${row.a}-${row.b}-${i}`
                      : `f-${row.index}-${i}`
                if (row.kind === 'vertex') {
                  return (
                    <li key={key}>
                      {t('rightPanel.selectionList.vertex', { index: row.index })}
                    </li>
                  )
                }
                if (row.kind === 'edge') {
                  return (
                    <li key={key}>
                      {t('rightPanel.selectionList.edge', { a: row.a, b: row.b })}
                    </li>
                  )
                }
                return (
                  <li key={key}>
                    {t('rightPanel.selectionList.face', { index: row.index })}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {appearanceEditActive && model && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t('rightPanel.appearance.title')}</div>
            <p className={styles.limitsInstallToolbarHint}>{t('rightPanel.appearance.hint')}</p>
            <EditAppearanceControls
              appearance={appearance}
              onAppearanceChange={onAppearanceChange}
            />
          </div>
        )}
        {!limitsInstallActive && !appearanceEditActive && faceStretchSelection && model && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t('rightPanel.faceDistance.title')}</div>
            <p className={styles.faceDistanceHint}>{t('rightPanel.faceDistance.hint')}</p>
            {analysis && analysis.ok && (
              <p className={styles.faceDistanceCurrent}>
                {t('rightPanel.faceDistance.current', {
                  value: Number(analysis.gapMm.toFixed(4)),
                })}
              </p>
            )}
            {analysis && !analysis.ok && (
              <p className={styles.faceDistanceError} role="alert">
                {t(`rightPanel.faceDistance.errors.${analysis.error}`)}
              </p>
            )}
            {analysis?.ok && (
              <div className={styles.faceDistanceRow}>
                <label className={styles.faceDistanceLabel} htmlFor="face-distance-mm">
                  {t('rightPanel.faceDistance.targetLabel')}
                </label>
                <div className={styles.faceDistanceInputWrap}>
                  <input
                    id="face-distance-mm"
                    className={styles.faceDistanceInput}
                    type="text"
                    inputMode="decimal"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter = to samo co przycisk „Apply”
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      handleApply()
                    }}
                    aria-invalid={applyError === 'invalidTarget'}
                    aria-describedby={
                      [
                        stretchDistanceBoundHint !== null ? 'face-distance-bound-hint' : null,
                        profilStretchBoundHintKey !== null ? 'face-distance-profil-band-hint' : null,
                      ]
                        .filter((x): x is string => typeof x === 'string' && x.length > 0)
                        .join(' ') || undefined
                    }
                  />
                  <span className={styles.faceDistanceUnit}>mm</span>
                </div>
                <button type="button" className={styles.faceDistanceApply} onClick={handleApply}>
                  {t('rightPanel.faceDistance.apply')}
                </button>
              </div>
            )}
            {analysis?.ok && stretchDistanceBoundHint !== null && (
              <p id="face-distance-bound-hint" className={styles.faceDistanceBoundHint} role="status">
                {t(`rightPanel.faceDistance.boundHints.${stretchDistanceBoundHint.kind}`, {
                  minMm: Number(stretchDistanceBoundHint.envelope.lower.toFixed(4)),
                  maxMm: Number(stretchDistanceBoundHint.envelope.upper.toFixed(4)),
                  exactMm:
                    stretchDistanceBoundHint.envelope.pinConstMm !== null
                      ? Number(stretchDistanceBoundHint.envelope.pinConstMm.toFixed(4))
                      : 0,
                })}
              </p>
            )}
            {analysis?.ok && profilStretchBoundHintKey !== null && profilStretchGapBandMm !== null && (
              <p id="face-distance-profil-band-hint" className={styles.faceDistanceBoundHint} role="status">
                {t(`rightPanel.faceDistance.profilBoundHints.${profilStretchBoundHintKey}`, {
                  minMm: Number(profilStretchGapBandMm.lower.toFixed(4)),
                  maxMm: Number(profilStretchGapBandMm.upper.toFixed(4)),
                })}
              </p>
            )}
            {applyError && (
              <p className={styles.faceDistanceError} role="alert">
                {t(`rightPanel.faceDistance.errors.${applyError}`)}
              </p>
            )}
            {panelSpanApplyError !== null && (
              <p className={styles.faceDistanceError} role="alert">
                {i18n.exists(`rightPanel.faceDistance.errors.${panelSpanApplyError}`)
                  ? t(`rightPanel.faceDistance.errors.${panelSpanApplyError}`)
                  : panelSpanApplyError}
              </p>
            )}
          </div>
        )}
        {model && limitsInstallActive && !faceStretchSelection && constraintType !== 'block' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{t('rightPanel.limits.title')}</div>
            <p className={styles.limitsInstallToolbarHint}>{t('rightPanel.limits.waitingStretchSelection')}</p>
            <div className={styles.faceDistanceRow}>
              <label className={styles.faceDistanceLabel} htmlFor="constraint-type-wait">
                {t('rightPanel.limits.type')}
              </label>
              <select
                id="constraint-type-wait"
                className={styles.faceDistanceInput}
                value={constraintType}
                onChange={(e) => onLimitsInstallConstraintTypeChange(e.target.value as FaceConstraintType)}
              >
                <option value="minmax">{t('rightPanel.limits.optionMinMax')}</option>
                <option value="const">{t('rightPanel.limits.optionConst')}</option>
                <option value="profil">{t('rightPanel.limits.optionProfil')}</option>
                <option value="block">{t('rightPanel.limits.optionBlock')}</option>
                <option value="panel">{t('rightPanel.limits.optionPanel')}</option>
              </select>
            </div>
          </div>
        )}
        {limitsActivePairPanel.showSection && (
        <div className={styles.section}>
          <div className={styles.faceDistanceRow}>
            <label className={styles.faceDistanceLabel} htmlFor="constraint-type">
              {t('rightPanel.limits.type')}
            </label>
            <select
              id="constraint-type"
              className={styles.faceDistanceInput}
              value={constraintType}
              onChange={(e) => onLimitsInstallConstraintTypeChange(e.target.value as FaceConstraintType)}
            >
              <option value="minmax">{t('rightPanel.limits.optionMinMax')}</option>
              <option value="const">{t('rightPanel.limits.optionConst')}</option>
              <option value="profil">{t('rightPanel.limits.optionProfil')}</option>
              <option value="block">{t('rightPanel.limits.optionBlock')}</option>
              <option value="panel">{t('rightPanel.limits.optionPanel')}</option>
            </select>
            {limitsActivePairPanel.isBlockInstall && (
              <p className={styles.limitsInstallToolbarHint}>{t('rightPanel.limits.blockWorkflowHint')}</p>
            )}
            {constraintType === 'minmax' && (
              <div className={styles.minMaxBoundsInputs}>
                <label className={styles.panelCheckboxRow}>
                  <input
                    type="checkbox"
                    checked={boundsUseMin}
                    onChange={(e) => setBoundsUseMin(e.target.checked)}
                  />
                  {t('rightPanel.limits.boundsUseMin')}
                </label>
                {boundsUseMin && (
                  <div className={styles.faceDistanceInputWrap}>
                    <label className={styles.visuallyHidden} htmlFor="limit-bounds-min">
                      {t('rightPanel.limits.boundsMinMm')}
                    </label>
                    <input
                      id="limit-bounds-min"
                      className={styles.faceDistanceInput}
                      type="text"
                      inputMode="decimal"
                      value={boundsMinMmInput}
                      onChange={(e) => setBoundsMinMmInput(e.target.value)}
                      placeholder={t('rightPanel.limits.boundsMinMmPlaceholder')}
                      title={t('rightPanel.limits.boundsMinMmHint')}
                      aria-label={t('rightPanel.limits.boundsMinMm')}
                    />
                    <span className={styles.faceDistanceUnit}>{t('rightPanel.limits.boundsUnitMin')}</span>
                  </div>
                )}
                <div className={styles.faceDistanceInputWrap}>
                  <label className={styles.visuallyHidden} htmlFor="limit-bounds-max">
                    {t('rightPanel.limits.boundsMaxMm')}
                  </label>
                  <input
                    id="limit-bounds-max"
                    className={styles.faceDistanceInput}
                    type="text"
                    inputMode="decimal"
                    value={boundsMaxMmInput}
                    onChange={(e) => setBoundsMaxMmInput(e.target.value)}
                    placeholder={t('rightPanel.limits.boundsMaxMm')}
                    aria-label={t('rightPanel.limits.boundsMaxMm')}
                  />
                  <span className={styles.faceDistanceUnit}>{t('rightPanel.limits.boundsUnitMax')}</span>
                </div>
              </div>
            )}
            {constraintType === 'const' && (
              <div className={styles.faceDistanceInputWrap}>
                <input
                  className={styles.faceDistanceInput}
                  type="text"
                  inputMode="decimal"
                  value={constraintValue}
                  onChange={(e) => setConstraintValue(e.target.value)}
                  placeholder={t('rightPanel.limits.valuePlaceholder')}
                />
                <span className={styles.faceDistanceUnit}>mm</span>
              </div>
            )}
            {constraintType === 'profil' && (
              <div className={styles.panelConstraintFields}>
                <p className={styles.panelWorkflowHint}>{t('rightPanel.limits.profilWorkflowIntro')}</p>
                <div className={styles.panelFieldGroup}>
                  <div className={styles.panelAxisLabel}>{t('rightPanel.limits.profilFrozenDimsTitle')}</div>
                  <p className={styles.panelExtentsHintMuted}>{t('rightPanel.limits.profilFrozenPickHint')}</p>
                  {profilStretchTrianglesSnapshot && (
                    <p className={styles.panelExtentsMeasured}>{t('rightPanel.limits.profilStretchPairLocked')}</p>
                  )}
                  <button
                    type="button"
                    className={
                      profilFrozenPickArm === 1
                        ? `${styles.panelCaptureBtn} ${styles.panelCaptureBtnActive}`
                        : styles.panelCaptureBtn
                    }
                    onClick={() => handleProfilFrozenSlotPress(1)}
                  >
                    {profilFrozenPickArm === 1
                      ? t('rightPanel.limits.profilConfirmFrozen1')
                      : t('rightPanel.limits.profilSelectFrozen1')}
                  </button>
                  {profilFrozenSlot1Ids ? (
                    <p className={styles.panelExtentsMeasured}>
                      {t('rightPanel.limits.panelCapturedPairOk', {
                        a: profilFrozenSlot1Ids.a,
                        b: profilFrozenSlot1Ids.b,
                      })}
                    </p>
                  ) : (
                    <p className={styles.panelExtentsHintMuted}>{t('rightPanel.limits.panelNotCapturedYet')}</p>
                  )}
                  <button
                    type="button"
                    className={
                      profilFrozenPickArm === 2
                        ? `${styles.panelCaptureBtn} ${styles.panelCaptureBtnActive}`
                        : styles.panelCaptureBtn
                    }
                    onClick={() => handleProfilFrozenSlotPress(2)}
                  >
                    {profilFrozenPickArm === 2
                      ? t('rightPanel.limits.profilConfirmFrozen2')
                      : t('rightPanel.limits.profilSelectFrozen2')}
                  </button>
                  {profilFrozenSlot2Ids ? (
                    <p className={styles.panelExtentsMeasured}>
                      {t('rightPanel.limits.panelCapturedPairOk', {
                        a: profilFrozenSlot2Ids.a,
                        b: profilFrozenSlot2Ids.b,
                      })}
                    </p>
                  ) : (
                    <p className={styles.panelExtentsHintMuted}>{t('rightPanel.limits.panelNotCapturedYet')}</p>
                  )}
                  {profilFrozenPickArm !== null && (
                    <>
                      <p className={styles.panelExtentsHintMuted} role="status">
                        {t('rightPanel.limits.profilFrozenArmHint', { n: profilFrozenPickArm })}
                      </p>
                      <button type="button" className={styles.panelCaptureBtnSecondary} onClick={cancelProfilFrozenPick}>
                        {t('rightPanel.limits.profilFrozenCancelPick')}
                      </button>
                    </>
                  )}
                </div>
                <div className={styles.faceDistanceInputWrap}>
                  <input
                    className={styles.faceDistanceInput}
                    type="text"
                    inputMode="decimal"
                    value={constraintValue}
                    onChange={(e) => setConstraintValue(e.target.value)}
                    placeholder={t('rightPanel.limits.profilMaxStretchPlaceholder')}
                  />
                  <span className={styles.faceDistanceUnit}>mm</span>
                </div>
                <label className={styles.panelCheckboxRow}>
                  <input
                    type="checkbox"
                    checked={profilStretchUseMin}
                    onChange={(e) => setProfilStretchUseMin(e.target.checked)}
                  />
                  {t('rightPanel.limits.profilStretchRestrictMin')}
                </label>
                {profilStretchUseMin && (
                  <div className={styles.faceDistanceInputWrap}>
                    <input
                      className={styles.faceDistanceInput}
                      type="text"
                      inputMode="decimal"
                      value={profilStretchMinMm}
                      onChange={(e) => setProfilStretchMinMm(e.target.value)}
                      placeholder={t('rightPanel.limits.profilMinStretchPlaceholder')}
                    />
                    <span className={styles.faceDistanceUnit}>mm</span>
                  </div>
                )}
                <p className={styles.panelExtentsHintMuted}>{t('rightPanel.limits.profilStretchAfterFrozenHint')}</p>
              </div>
            )}
            {constraintType === 'panel' && (
              <div className={styles.panelConstraintFields}>
                <p className={styles.panelWorkflowHint}>{t('rightPanel.limits.panelWorkflowIntro')}</p>
                <div className={styles.panelFieldGroup}>
                  <div className={styles.panelAxisLabel}>{t('rightPanel.limits.panelGroupConst')}</div>
                  <p className={styles.panelExtentsHintMuted}>{t('rightPanel.limits.panelThicknessFrozenHint')}</p>
                  <p className={styles.panelExtentsMeasured}>
                    {panelThicknessPairReady
                      ? t('rightPanel.limits.panelThicknessSelectionUnlockedForXY')
                      : t('rightPanel.limits.panelThicknessLockPending')}
                  </p>
                  <div className={styles.faceDistanceInputWrap}>
                    <input
                      className={styles.faceDistanceInput}
                      type="text"
                      inputMode="decimal"
                      value={panelThicknessMmInput}
                      onChange={(e) => setPanelThicknessMmInput(e.target.value)}
                      placeholder={t('rightPanel.limits.panelThicknessInputPlaceholder')}
                      aria-label={t('rightPanel.limits.panelGroupConst')}
                      disabled={!panelThicknessPairReady}
                    />
                    <span className={styles.faceDistanceUnit}>mm</span>
                  </div>
                </div>
                <div className={styles.panelFieldGroup}>
                  <div className={styles.panelAxisLabel}>{t('rightPanel.limits.panelGroupMinMaxX')}</div>
                  <div className={styles.panelSpanBlock}>
                    <p className={styles.panelExtentsHintMuted}>{t('rightPanel.limits.panelMeasurementPairSubtitle')}</p>
                    <p className={styles.panelExtentsHintMuted}>
                      {t(
                        panelThicknessPairReady
                          ? 'rightPanel.limits.panelFacesForXSpanHint'
                          : 'rightPanel.limits.panelPickTwoPlanesHint',
                      )}
                    </p>
                  <button
                    type="button"
                    className={
                      panelSpanPickArm === 'x'
                        ? `${styles.panelCaptureBtn} ${styles.panelCaptureBtnActive}`
                        : styles.panelCaptureBtn
                    }
                    onClick={() => handlePanelAxisPairPress('x')}
                  >
                    {panelSpanPickArm === 'x'
                      ? t('rightPanel.limits.panelConfirmPlanesX')
                      : t('rightPanel.limits.panelSelectPlanesX')}
                  </button>
                  {panelCapturedPairX ? (
                    <p className={styles.panelExtentsMeasured}>
                      {t('rightPanel.limits.panelCapturedPairOk', {
                        a: panelCapturedPairX.a,
                        b: panelCapturedPairX.b,
                      })}
                    </p>
                  ) : (
                    <p className={styles.panelExtentsHintMuted}>{t('rightPanel.limits.panelNotCapturedYet')}</p>
                  )}
                  {panelSpanPickArm === 'x' && (
                    <>
                      <p className={styles.panelExtentsHintMuted} role="status">
                        {t('rightPanel.limits.panelSpanArmHintX')}
                      </p>
                      <button type="button" className={styles.panelCaptureBtnSecondary} onClick={cancelPanelSpanPick}>
                        {t('rightPanel.limits.panelSpanCancelPick')}
                      </button>
                    </>
                  )}
                  </div>
                  <div className={styles.panelSpanBlock}>
                  <PanelAxisMinMaxFields
                    idPrefix="panel-axis-x"
                    useMin={panelXUseMin}
                    onUseMinChange={setPanelXUseMin}
                    minInput={panelXMin}
                    onMinInputChange={setPanelXMin}
                    maxInput={panelXMax}
                    onMaxInputChange={setPanelXMax}
                  />
                  </div>
                </div>
                <div className={styles.panelFieldGroup}>
                  <div className={styles.panelAxisLabel}>{t('rightPanel.limits.panelGroupMinMaxY')}</div>
                  <div className={styles.panelSpanBlock}>
                    <p className={styles.panelExtentsHintMuted}>{t('rightPanel.limits.panelMeasurementPairSubtitle')}</p>
                    <p className={styles.panelExtentsHintMuted}>
                      {t(
                        panelThicknessPairReady
                          ? 'rightPanel.limits.panelFacesForYSpanHint'
                          : 'rightPanel.limits.panelPickTwoPlanesHint',
                      )}
                    </p>
                  <button
                    type="button"
                    className={
                      panelSpanPickArm === 'y'
                        ? `${styles.panelCaptureBtn} ${styles.panelCaptureBtnActive}`
                        : styles.panelCaptureBtn
                    }
                    onClick={() => handlePanelAxisPairPress('y')}
                  >
                    {panelSpanPickArm === 'y'
                      ? t('rightPanel.limits.panelConfirmPlanesY')
                      : t('rightPanel.limits.panelSelectPlanesY')}
                  </button>
                  {panelCapturedPairY ? (
                    <p className={styles.panelExtentsMeasured}>
                      {t('rightPanel.limits.panelCapturedPairOk', {
                        a: panelCapturedPairY.a,
                        b: panelCapturedPairY.b,
                      })}
                    </p>
                  ) : (
                    <p className={styles.panelExtentsHintMuted}>{t('rightPanel.limits.panelNotCapturedYet')}</p>
                  )}
                  {panelSpanPickArm === 'y' && (
                    <>
                      <p className={styles.panelExtentsHintMuted} role="status">
                        {t('rightPanel.limits.panelSpanArmHintY')}
                      </p>
                      <button type="button" className={styles.panelCaptureBtnSecondary} onClick={cancelPanelSpanPick}>
                        {t('rightPanel.limits.panelSpanCancelPick')}
                      </button>
                    </>
                  )}
                  </div>
                  <label className={styles.panelCheckboxRow}>
                    <input
                      type="checkbox"
                      checked={panelYSameAsX}
                      onChange={(e) => setPanelYSameAsX(e.target.checked)}
                    />
                    {t('rightPanel.limits.panelYSameAsX')}
                  </label>
                  {!panelYSameAsX && (
                    <div className={styles.panelSpanBlock}>
                      <PanelAxisMinMaxFields
                        idPrefix="panel-axis-y"
                        useMin={panelYUseMin}
                        onUseMinChange={setPanelYUseMin}
                        minInput={panelYMin}
                        onMinInputChange={setPanelYMin}
                        maxInput={panelYMax}
                        onMaxInputChange={setPanelYMax}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            <button type="button" className={styles.faceDistanceApply} onClick={handleAddConstraint}>
              {t('rightPanel.limits.add')}
            </button>
            {constraintAddErrorText !== null && (
              <p className={styles.faceDistanceError} role="alert">
                {constraintAddErrorText}
              </p>
            )}
          </div>
          {faceConstraints.length === 0 ? (
            <p className={styles.selectionListEmpty}>{t('rightPanel.limits.empty')}</p>
          ) : (
            <ul className={styles.selectionList}>
              {faceConstraints.map((item) => {
                const { primary, tooltip } = formatConstraintUiSummary({
                  constraint: item,
                  geometry: model,
                  modelElements: preparedModelElements,
                  t,
                })
                return (
                <li key={item.id} title={tooltip}>
                  <span>
                    {item.type.toUpperCase()}
                    {' · '}
                    {primary}
                  </span>
                  <button
                    type="button"
                    className={styles.constraintRemove}
                    disabled={constraintsLocked}
                    title={
                      constraintsLocked
                        ? t('rightPanel.limits.removeDisabledWhenLocked')
                        : undefined
                    }
                    onClick={() => handleRemoveConstraint(item.id)}
                  >
                    {t('rightPanel.limits.remove')}
                  </button>
                </li>
                )
              })}
            </ul>
          )}
        </div>
        )}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('rightPanel.scale')}</div>
          <p className={styles.placeholder}>{t('rightPanel.scaleHint')}</p>
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('rightPanel.rotation')}</div>
          <p className={styles.placeholder}>{t('rightPanel.rotationHint')}</p>
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('rightPanel.colorTexture')}</div>
          <p className={styles.placeholder}>{t('rightPanel.colorTextureHint')}</p>
        </div>
      </div>
    </aside>
  )
}
