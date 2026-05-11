import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BufferGeometry } from 'three'
import { useTranslation } from 'react-i18next'
import { analyzeTwoFaceStretch, type TwoFaceStretchError } from '../lib/twoFaceStretch'
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
import { parsePositiveMm } from '../lib/parsePositiveMm'
import type { PreparedStretchPrecheckError } from '../lib/preparedStretchValidation'
import type { PreparedModelElement } from '../lib/preparedElementFormat'
import { boundingBoxThicknessAndInPlaneSpansMm } from '../features/face-constraints/panelExtentsFromBBox'
import {
  findMatchingPanelThicknessConstraint,
  findMatchingProfilStretchConstraint,
} from '../features/part-constraints/findMatchingPartConstraintDimensions'
import { mergeTrianglesForPreparedElementPair } from '../features/part-constraints/mergeFacesForPreparedElementPair'
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
import { formatConstraintUiSummary } from '../features/face-constraints/formatConstraintUiSummary'
import { removeFaceConstraint, upsertFaceConstraint } from '../features/face-constraints/store'
import styles from './RightPanel.module.css'

export interface RightPanelProps {
  selection: SelectionState
  probableFaces?: readonly number[]
  model: BufferGeometry | null
  geometryRevision: number
  constraintsLocked: boolean
  /** Aktywny przycisk „Limits” na zakładce Edit — pokazuje formularz na panelu */
  limitsInstallActive: boolean
  limitsInstallConstraintType: FaceConstraintType
  onLimitsInstallConstraintTypeChange: (next: FaceConstraintType) => void
  preparedModelElements: readonly PreparedModelElement[]
  onApplyTwoFaceStretch: (
    targetMm: number,
    overlay?: ApplyTwoFaceStretchOverlay,
  ) =>
    | { ok: true; geometry: BufferGeometry; effectiveTargetMm: number }
    | { ok: false; error: TwoFaceStretchError | PreparedStretchPrecheckError }
  faceConstraints: FaceConstraint[]
  onFaceConstraintsChange: (next: FaceConstraint[]) => void
  onMergeModelElements: (elements: readonly PreparedModelElement[]) => void
  /** Po zatwierdzeniu zamrożonej pary: przywróć zaznaczenie pary rozciągania (PROFIL). */
  onRestoreFaceSelection?: (faceTriangleIndices: readonly number[]) => void
}

function naiveStretchMmAfterAddingMinMax(
  currentGapMm: number,
  minMm: number,
  maxMm: number,
): number {
  return Math.min(Math.max(currentGapMm, minMm), maxMm)
}

function naiveStretchMmAfterAddingProfil(
  currentGapMm: number,
  maxMm: number,
  minMm: number | undefined,
): number {
  const floor = typeof minMm === 'number' && Number.isFinite(minMm) && minMm > 0 ? minMm : 1e-4
  return Math.min(Math.max(currentGapMm, floor), maxMm)
}

export function RightPanel({
  selection,
  probableFaces = [],
  model,
  geometryRevision,
  constraintsLocked,
  limitsInstallActive,
  limitsInstallConstraintType,
  onLimitsInstallConstraintTypeChange,
  preparedModelElements,
  onApplyTwoFaceStretch,
  faceConstraints,
  onFaceConstraintsChange,
  onMergeModelElements,
  onRestoreFaceSelection,
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
  const [panelSpanXInput, setPanelSpanXInput] = useState('')
  const [panelSpanYInput, setPanelSpanYInput] = useState('')
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

  const panelThicknessInvariantTriangles = useMemo((): readonly number[] | null => {
    if (!matchingPanelThicknessConstraint || !faceStretchSelection || facesForStretch.length === 0)
      return null
    return [...facesForStretch]
  }, [matchingPanelThicknessConstraint, faceStretchSelection, facesForStretch])

  const panelSpanXTriangles = useMemo(() => {
    if (
      !matchingPanelThicknessConstraint ||
      matchingPanelThicknessConstraint.panelMeasureMode !== 'facePairs'
    )
      return null
    const xa = matchingPanelThicknessConstraint.panelXElementAId
    const xb = matchingPanelThicknessConstraint.panelXElementBId
    if (!xa?.trim() || !xb?.trim()) return null
    return mergeTrianglesForPreparedElementPair(preparedModelElements, xa, xb)
  }, [matchingPanelThicknessConstraint, preparedModelElements])

  const panelSpanYTriangles = useMemo(() => {
    if (
      !matchingPanelThicknessConstraint ||
      matchingPanelThicknessConstraint.panelMeasureMode !== 'facePairs'
    )
      return null
    const ya = matchingPanelThicknessConstraint.panelYElementAId
    const yb = matchingPanelThicknessConstraint.panelYElementBId
    if (!ya?.trim() || !yb?.trim()) return null
    return mergeTrianglesForPreparedElementPair(preparedModelElements, ya, yb)
  }, [matchingPanelThicknessConstraint, preparedModelElements])

  const spanXStretchAnalysis = useMemo(() => {
    if (!model || !panelSpanXTriangles?.length) return null
    return analyzeTwoFaceStretch(model, panelSpanXTriangles)
  }, [model, geometryRevision, panelSpanXTriangles])

  const spanYStretchAnalysis = useMemo(() => {
    if (!model || !panelSpanYTriangles?.length) return null
    return analyzeTwoFaceStretch(model, panelSpanYTriangles)
  }, [model, geometryRevision, panelSpanYTriangles])

  const panelBBoxTriple = useMemo(() => {
    if (
      !matchingPanelThicknessConstraint ||
      matchingPanelThicknessConstraint.panelMeasureMode !== 'bboxExtents'
    )
      return null
    return boundingBoxThicknessAndInPlaneSpansMm(model)
  }, [matchingPanelThicknessConstraint, model, geometryRevision])

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

  useEffect(() => {
    if (!spanXStretchAnalysis?.ok) return
    const s = String(Number(spanXStretchAnalysis.gapMm.toFixed(6)))
    setPanelSpanXInput(s)
  }, [spanXStretchAnalysis, geometryRevision])

  useEffect(() => {
    if (!spanYStretchAnalysis?.ok) return
    setPanelSpanYInput(String(Number(spanYStretchAnalysis.gapMm.toFixed(6))))
  }, [spanYStretchAnalysis, geometryRevision])

  const handleApply = useCallback(() => {
    const mm = parsePositiveMm(targetInput)
    if (mm === null) {
      setApplyError('invalidTarget')
      return
    }
    const result = onApplyTwoFaceStretch(mm)
    if (!result.ok) {
      setApplyError(result.error)
      return
    }
    setApplyError(null)
    if (Math.abs(result.effectiveTargetMm - mm) > 1e-4) {
      setTargetInput(String(Number(result.effectiveTargetMm.toFixed(6))))
    }
  }, [onApplyTwoFaceStretch, targetInput])

  const handleApplyPanelSpan = useCallback(
    (axis: 'x' | 'y') => {
      setPanelSpanApplyError(null)
      const raw = axis === 'x' ? panelSpanXInput : panelSpanYInput
      const mm = parsePositiveMm(raw)
      if (mm === null) {
        setPanelSpanApplyError('invalidTarget')
        return
      }
      const merged = axis === 'x' ? panelSpanXTriangles : panelSpanYTriangles
      if (!merged?.length || !panelThicknessInvariantTriangles?.length) {
        setPanelSpanApplyError('invalidGeometry')
        return
      }
      const overlay: ApplyTwoFaceStretchOverlay = {
        mergedFaces: merged,
        panelThicknessMergedFaces: [...panelThicknessInvariantTriangles],
      }
      const result = onApplyTwoFaceStretch(mm, overlay)
      if (!result.ok) {
        setPanelSpanApplyError(result.error)
        return
      }
      setPanelSpanApplyError(null)
      const formatted = String(Number(result.effectiveTargetMm.toFixed(6)))
      if (axis === 'x') {
        setPanelSpanXInput(formatted)
      } else {
        setPanelSpanYInput(formatted)
      }
    },
    [
      panelSpanXInput,
      panelSpanYInput,
      panelSpanXTriangles,
      panelSpanYTriangles,
      panelThicknessInvariantTriangles,
      onApplyTwoFaceStretch,
    ],
  )

  const facePair =
    facesForStretch.length >= 2 ? { a: Math.min(facesForStretch[0], facesForStretch[1]), b: Math.max(facesForStretch[0], facesForStretch[1]) } : null

  const lockedThicknessAnalysis = useMemo(() => {
    if (!model || !frozenThicknessFaces?.length) return null
    return analyzeTwoFaceStretch(model, frozenThicknessFaces)
  }, [model, geometryRevision, frozenThicknessFaces])

  const lockedPanelThicknessMm =
    lockedThicknessAnalysis?.ok === true ? Number(lockedThicknessAnalysis.gapMm.toFixed(6)) : null

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
      if (lockedPanelThicknessMm === null || !frozenThicknessFaces?.length) {
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
      if (panelThicknessTrianglesSnapshot === null) {
        setPanelThicknessTrianglesSnapshot([...frozenThicknessFaces])
      }
      setPanelSpanPickArm(axis)
    },
    [
      facesForStretch,
      frozenThicknessFaces,
      lockedPanelThicknessMm,
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
      const next: FaceConstraint = { id, type: 'block', facePair: null }
      onFaceConstraintsChange(upsertFaceConstraint(faceConstraints, next))
      return
    }

    if (constraintType === 'panel') {
      if (panelSpanPickArm !== null) {
        setConstraintError('panelFinishOrCancelSpanPick')
        return
      }
      if (lockedPanelThicknessMm === null) {
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
      const maxX = parsePositiveMm(panelXMax)
      if (maxX === null) {
        setConstraintError('invalidValue')
        return
      }
      let panelXBounds: PanelAxisBounds
      if (panelXUseMin) {
        const minX = parsePositiveMm(panelXMin)
        if (minX === null) {
          setConstraintError('invalidValue')
          return
        }
        if (minX > maxX) {
          setConstraintError('invalidRange')
          return
        }
        panelXBounds = { maxMm: maxX, minMm: minX }
      } else {
        panelXBounds = { maxMm: maxX }
      }

      let panelYBounds: PanelAxisBounds
      let ySameAsX = false
      if (panelYSameAsX) {
        ySameAsX = true
        panelYBounds =
          panelXBounds.minMm === undefined
            ? { maxMm: panelXBounds.maxMm }
            : { maxMm: panelXBounds.maxMm, minMm: panelXBounds.minMm }
      } else {
        const maxY = parsePositiveMm(panelYMax)
        if (maxY === null) {
          setConstraintError('invalidValue')
          return
        }
        if (panelYUseMin) {
          const minY = parsePositiveMm(panelYMin)
          if (minY === null) {
            setConstraintError('invalidValue')
            return
          }
          if (minY > maxY) {
            setConstraintError('invalidRange')
            return
          }
          panelYBounds = { maxMm: maxY, minMm: minY }
        } else {
          panelYBounds = { maxMm: maxY }
        }
      }

      const xa = panelCapturedPairX.a
      const xb = panelCapturedPairX.b
      const ya = panelCapturedPairY.a
      const yb = panelCapturedPairY.b
      const next: FaceConstraint = {
        id,
        type: 'panel',
        facePair: null,
        thicknessMm: lockedPanelThicknessMm,
        panelX: panelXBounds,
        panelY: panelYBounds,
        ySameAsX,
        panelMeasureMode: 'facePairs',
        panelXElementAId: xa,
        panelXElementBId: xb,
        panelYElementAId: ya,
        panelYElementBId: yb,
      }
      onFaceConstraintsChange(upsertFaceConstraint(faceConstraints, next))
      return
    }

    if (constraintType === 'profil') {
      if (!model) {
        setConstraintError('needTwoFaces')
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
      const patches = partitionSelectionIntoCoplanarPatches(model, stretchPick)
      if (patches.length !== 2) {
        setConstraintError('needTwoPlanarGroups')
        return
      }
      const pid = Date.now()
      const rand = Math.random().toString(36).slice(2, 6)
      const stretchAId = `el-${pid}-${rand}-s-a`
      const stretchBId = `el-${pid}-${rand}-s-b`
      const ua = [...patches[0]]
      const ub = [...patches[1]]
      ua.sort((x, y) => x - y)
      ub.sort((x, y) => x - y)
      const repA = ua[0]!
      const repB = ub[0]!
      const next: FaceConstraint = {
        id,
        type: 'profil',
        facePair: { a: repA, b: repB },
        elementAId: stretchAId,
        elementBId: stretchBId,
        valueMm,
        ...(stretchMinMm !== undefined ? { stretchMinMm } : {}),
        frozen1: { elementAId: profilFrozenSlot1Ids.a, elementBId: profilFrozenSlot1Ids.b },
        frozen2: { elementAId: profilFrozenSlot2Ids.a, elementBId: profilFrozenSlot2Ids.b },
      }
      const nextList = upsertFaceConstraint(faceConstraints, next)
      const extraEls = [
        { id: stretchAId, faceIndices: ua },
        { id: stretchBId, faceIndices: ub },
      ]
      const gapAn = analyzeTwoFaceStretch(model, stretchPick)
      if (!gapAn.ok) {
        setConstraintError('needTwoPlanarGroups')
        return
      }
      const rawMm = naiveStretchMmAfterAddingProfil(gapAn.gapMm, valueMm, stretchMinMm)
      const stretchRes = onApplyTwoFaceStretch(rawMm, {
        mergedFaces: [...stretchPick],
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
    lockedPanelThicknessMm,
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
      onFaceConstraintsChange(removeFaceConstraint(faceConstraints, id))
    },
    [faceConstraints, onFaceConstraintsChange],
  )

  const constraintAddErrorText =
    constraintError === null
      ? null
      : i18n.exists(`rightPanel.limits.errors.${constraintError}`)
        ? t(`rightPanel.limits.errors.${constraintError}`)
        : t(`rightPanel.faceDistance.errors.${constraintError}`)

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
        {faceStretchSelection && model && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {matchingPanelThicknessConstraint !== null
                ? t('rightPanel.faceDistance.titlePanel')
                : matchingProfilStretchConstraint !== null
                  ? t('rightPanel.faceDistance.titleProfileStretch')
                  : t('rightPanel.faceDistance.title')}
            </div>
            <p className={styles.faceDistanceHint}>
              {matchingPanelThicknessConstraint !== null
                ? t('rightPanel.faceDistance.hintPanelThicknessAxis')
                : matchingProfilStretchConstraint !== null
                  ? t('rightPanel.faceDistance.hintProfilStretch')
                  : t('rightPanel.faceDistance.hint')}
            </p>
            {analysis && analysis.ok && (
              <p className={styles.faceDistanceCurrent}>
                {matchingPanelThicknessConstraint !== null
                  ? t('rightPanel.faceDistance.currentPanelThickness', {
                      value: Number(analysis.gapMm.toFixed(4)),
                    })
                  : matchingProfilStretchConstraint !== null
                    ? t('rightPanel.faceDistance.currentProfileStretchGap', {
                        value: Number(analysis.gapMm.toFixed(4)),
                      })
                    : t('rightPanel.faceDistance.current', {
                        value: Number(analysis.gapMm.toFixed(4)),
                      })}
              </p>
            )}
            {matchingPanelThicknessConstraint?.panelMeasureMode === 'bboxExtents' &&
              panelBBoxTriple &&
              analysis?.ok && (
                <>
                  <p className={styles.faceDistanceBoundHint} role="status">
                    {t('rightPanel.faceDistance.panelBBoxSpanMinor', {
                      value: Number(panelBBoxTriple.inPlaneMinorMm.toFixed(4)),
                    })}
                  </p>
                  <p className={styles.faceDistanceBoundHint} role="status">
                    {t('rightPanel.faceDistance.panelBBoxSpanMajor', {
                      value: Number(panelBBoxTriple.inPlaneMajorMm.toFixed(4)),
                    })}
                  </p>
                </>
              )}
            {analysis && !analysis.ok && (
              <p className={styles.faceDistanceError} role="alert">
                {t(`rightPanel.faceDistance.errors.${analysis.error}`)}
              </p>
            )}
            {analysis?.ok && (
              <div className={styles.faceDistanceRow}>
                <label className={styles.faceDistanceLabel} htmlFor="face-distance-mm">
                  {matchingPanelThicknessConstraint !== null
                    ? t('rightPanel.faceDistance.targetThickness')
                    : matchingProfilStretchConstraint !== null
                      ? t('rightPanel.faceDistance.targetProfilStretch')
                      : t('rightPanel.faceDistance.targetLabel')}
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
            {matchingPanelThicknessConstraint?.panelMeasureMode === 'facePairs' &&
              spanXStretchAnalysis?.ok && (
                <div className={styles.panelSpanBlock}>
                  <div className={styles.faceDistanceRow}>
                    <label className={styles.faceDistanceLabel} htmlFor="panel-span-x-mm">
                      {t('rightPanel.faceDistance.targetPanelSpanX')}
                    </label>
                    <div className={styles.faceDistanceInputWrap}>
                      <input
                        id="panel-span-x-mm"
                        className={styles.faceDistanceInput}
                        type="text"
                        inputMode="decimal"
                        value={panelSpanXInput}
                        onChange={(e) => setPanelSpanXInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return
                          e.preventDefault()
                          handleApplyPanelSpan('x')
                        }}
                        aria-invalid={panelSpanApplyError === 'invalidTarget'}
                      />
                      <span className={styles.faceDistanceUnit}>mm</span>
                    </div>
                    <button type="button" className={styles.faceDistanceApply} onClick={() => handleApplyPanelSpan('x')}>
                      {t('rightPanel.faceDistance.apply')}
                    </button>
                  </div>
                  <p className={styles.faceDistanceCurrent}>
                    {t('rightPanel.faceDistance.currentSpanX', {
                      value: Number(spanXStretchAnalysis.gapMm.toFixed(4)),
                    })}
                  </p>
                  {spanYStretchAnalysis?.ok && (
                    <>
                      <div className={styles.faceDistanceRow}>
                        <label className={styles.faceDistanceLabel} htmlFor="panel-span-y-mm">
                          {t('rightPanel.faceDistance.targetPanelSpanY')}
                        </label>
                        <div className={styles.faceDistanceInputWrap}>
                          <input
                            id="panel-span-y-mm"
                            className={styles.faceDistanceInput}
                            type="text"
                            inputMode="decimal"
                            value={panelSpanYInput}
                            onChange={(e) => setPanelSpanYInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return
                              e.preventDefault()
                              handleApplyPanelSpan('y')
                            }}
                            aria-invalid={panelSpanApplyError === 'invalidTarget'}
                          />
                          <span className={styles.faceDistanceUnit}>mm</span>
                        </div>
                        <button type="button" className={styles.faceDistanceApply} onClick={() => handleApplyPanelSpan('y')}>
                          {t('rightPanel.faceDistance.apply')}
                        </button>
                      </div>
                      <p className={styles.faceDistanceCurrent}>
                        {t('rightPanel.faceDistance.currentSpanY', {
                          value: Number(spanYStretchAnalysis.gapMm.toFixed(4)),
                        })}
                      </p>
                    </>
                  )}
                </div>
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
        {model && limitsInstallActive && !faceStretchSelection && (
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
        {model && limitsInstallActive && faceStretchSelection && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('rightPanel.limits.title')}</div>
          <p className={styles.faceDistanceHint}>{t('rightPanel.limits.hint')}</p>
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
                  <div className={styles.panelAxisLabel}>{t('rightPanel.limits.panelThicknessSection')}</div>
                  <p className={styles.panelExtentsHintMuted}>{t('rightPanel.limits.panelThicknessFrozenHint')}</p>
                  <p className={styles.panelExtentsMeasured}>
                    {lockedPanelThicknessMm !== null
                      ? t('rightPanel.limits.panelThicknessSelectionUnlockedForXY')
                      : t('rightPanel.limits.panelThicknessLockPending')}
                  </p>
                  <div className={styles.faceDistanceInputWrap}>
                    <input
                      className={styles.faceDistanceInput}
                      type="text"
                      value={lockedPanelThicknessMm === null ? '' : String(lockedPanelThicknessMm)}
                      placeholder={t('rightPanel.limits.panelThickness')}
                      readOnly
                    />
                    <span className={styles.faceDistanceUnit}>mm</span>
                  </div>
                </div>
                <div className={styles.panelFieldGroup}>
                  <div className={styles.panelAxisLabel}>{t('rightPanel.limits.panelFacesForXTitle')}</div>
                  <p className={styles.panelExtentsHintMuted}>
                    {t(
                      lockedPanelThicknessMm !== null
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
                  <div className={styles.panelAxisLabel}>{t('rightPanel.limits.panelAxisXLimitsTitle')}</div>
                  <div className={styles.faceDistanceInputWrap}>
                    <input
                      className={styles.faceDistanceInput}
                      type="text"
                      inputMode="decimal"
                      value={panelXMax}
                      onChange={(e) => setPanelXMax(e.target.value)}
                      placeholder={t('rightPanel.limits.panelMaxPlaceholder')}
                    />
                    <span className={styles.faceDistanceUnit}>mm</span>
                  </div>
                  <label className={styles.panelCheckboxRow}>
                    <input
                      type="checkbox"
                      checked={panelXUseMin}
                      onChange={(e) => setPanelXUseMin(e.target.checked)}
                    />
                    {t('rightPanel.limits.panelRestrictMin')}
                  </label>
                  {panelXUseMin && (
                    <div className={styles.faceDistanceInputWrap}>
                      <input
                        className={styles.faceDistanceInput}
                        type="text"
                        inputMode="decimal"
                        value={panelXMin}
                        onChange={(e) => setPanelXMin(e.target.value)}
                        placeholder={t('rightPanel.limits.panelMinPlaceholder')}
                      />
                      <span className={styles.faceDistanceUnit}>mm</span>
                    </div>
                  )}
                </div>
                <div className={styles.panelFieldGroup}>
                  <div className={styles.panelAxisLabel}>{t('rightPanel.limits.panelFacesForYTitle')}</div>
                  <p className={styles.panelExtentsHintMuted}>
                    {t(
                      lockedPanelThicknessMm !== null
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
                  <label className={styles.panelCheckboxRow}>
                    <input
                      type="checkbox"
                      checked={panelYSameAsX}
                      onChange={(e) => setPanelYSameAsX(e.target.checked)}
                    />
                    {t('rightPanel.limits.panelYSameAsX')}
                  </label>
                  {!panelYSameAsX && (
                    <>
                      <div className={styles.panelAxisLabel}>{t('rightPanel.limits.panelAxisYLimitsTitle')}</div>
                      <div className={styles.faceDistanceInputWrap}>
                        <input
                          className={styles.faceDistanceInput}
                          type="text"
                          inputMode="decimal"
                          value={panelYMax}
                          onChange={(e) => setPanelYMax(e.target.value)}
                          placeholder={t('rightPanel.limits.panelMaxPlaceholder')}
                        />
                        <span className={styles.faceDistanceUnit}>mm</span>
                      </div>
                      <label className={styles.panelCheckboxRow}>
                        <input
                          type="checkbox"
                          checked={panelYUseMin}
                          onChange={(e) => setPanelYUseMin(e.target.checked)}
                        />
                        {t('rightPanel.limits.panelRestrictMin')}
                      </label>
                      {panelYUseMin && (
                        <div className={styles.faceDistanceInputWrap}>
                          <input
                            className={styles.faceDistanceInput}
                            type="text"
                            inputMode="decimal"
                            value={panelYMin}
                            onChange={(e) => setPanelYMin(e.target.value)}
                            placeholder={t('rightPanel.limits.panelMinPlaceholder')}
                          />
                          <span className={styles.faceDistanceUnit}>mm</span>
                        </div>
                      )}
                    </>
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
