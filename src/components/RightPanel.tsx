import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BufferGeometry } from 'three'
import { useTranslation } from 'react-i18next'
import { analyzeTwoFaceStretch, type TwoFaceStretchError } from '../lib/twoFaceStretch'
import type { ApplyTwoFaceStretchOverlay } from '../lib/applyStretchOverlay'
import { partitionSelectionIntoCoplanarPatches } from '../features/model-selection/facePlaneSelection'
import { getSelectionListEntries, type SelectionState } from '../lib/selection'
import type { PreparedStretchPrecheckError } from '../lib/preparedStretchValidation'
import type { PreparedModelElement } from '../lib/preparedElementFormat'
import { mergedFacesMatchConstraintStretchPair } from '../features/part-constraints/matchesConstraintStretchPair'
import {
  stretchBasicEnvelopeForMergedPair,
  stretchInputDeviationKind,
} from '../features/part-constraints/stretchBasicEnvelopeForMergedPair'
import {
  formatPanelConstraintSummary,
  formatProfilStretchGapLabelMm,
  type FaceConstraint,
  type FaceConstraintType,
  type PanelAxisBounds,
} from '../features/face-constraints/model'
import { removeFaceConstraint, upsertFaceConstraint } from '../features/face-constraints/store'
import styles from './RightPanel.module.css'

export interface RightPanelProps {
  selection: SelectionState
  probableFaces?: readonly number[]
  model: BufferGeometry | null
  geometryRevision: number
  constraintsLocked: boolean
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
}

function parsePositiveMm(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim()
  if (normalized === '') return null
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** Cele zamosu po „Add”: jak Apply (CONST = pole, MIN/MAX dopasują zakres). */
function naiveStretchMmAfterAddingBasicConstraint(
  constraintType: 'min' | 'max' | 'const',
  valueMm: number,
  currentGapMm: number,
): number {
  if (constraintType === 'const') return valueMm
  if (constraintType === 'max') return Math.min(currentGapMm, valueMm)
  return Math.max(currentGapMm, valueMm)
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
  preparedModelElements,
  onApplyTwoFaceStretch,
  faceConstraints,
  onFaceConstraintsChange,
  onMergeModelElements,
}: RightPanelProps) {
  const { t, i18n } = useTranslation()
  const rows = useMemo(() => getSelectionListEntries(selection), [selection])

  const facesForStretch = useMemo(() => {
    const merged = [...selection.faces]
    const seen = new Set(selection.faces)
    for (const fi of probableFaces) {
      if (seen.has(fi)) continue
      merged.push(fi)
      seen.add(fi)
    }
    return merged
  }, [selection.faces, probableFaces])

  const faceStretchSelection =
    facesForStretch.length > 0 &&
    selection.vertices.length === 0 &&
    (selection.faces.length > 0 || selection.edges.length > 0)

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
  const [constraintType, setConstraintType] = useState<FaceConstraintType>('min')
  const prevConstraintTypeRef = useRef(constraintType)
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
  const [constraintError, setConstraintError] = useState<string | null>(null)
  const [profilFrozenSlot1Ids, setProfilFrozenSlot1Ids] = useState<{ a: string; b: string } | null>(null)
  const [profilFrozenSlot2Ids, setProfilFrozenSlot2Ids] = useState<{ a: string; b: string } | null>(null)
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

  const stretchDistanceBoundHint = useMemo(() => {
    if (!stretchEnvelope || stretchEnvelope.matchedConstraintCount === 0) return null
    const mm = parsePositiveMm(targetInput)
    if (mm === null) return null
    const kind = stretchInputDeviationKind(mm, stretchEnvelope)
    return kind === null ? null : { kind, envelope: stretchEnvelope }
  }, [targetInput, stretchEnvelope])

  useEffect(() => {
    setApplyError(null)
    setConstraintError(null)
  }, [selection, geometryRevision])

  useEffect(() => {
    if (constraintType !== 'profil') {
      setProfilFrozenSlot1Ids(null)
      setProfilFrozenSlot2Ids(null)
      setProfilStretchUseMin(false)
      setProfilStretchMinMm('')
    }
  }, [constraintType])

  useEffect(() => {
    const prev = prevConstraintTypeRef.current
    if (constraintType !== 'panel') {
      setFrozenThicknessFaces(null)
      setPanelCapturedPairX(null)
      setPanelCapturedPairY(null)
    } else if (prev !== 'panel') {
      setFrozenThicknessFaces(null)
      setPanelCapturedPairX(null)
      setPanelCapturedPairY(null)
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

  const facePair =
    facesForStretch.length >= 2 ? { a: Math.min(facesForStretch[0], facesForStretch[1]), b: Math.max(facesForStretch[0], facesForStretch[1]) } : null

  const lockedThicknessAnalysis = useMemo(() => {
    if (!model || !frozenThicknessFaces?.length) return null
    return analyzeTwoFaceStretch(model, frozenThicknessFaces)
  }, [model, geometryRevision, frozenThicknessFaces])

  const lockedPanelThicknessMm =
    lockedThicknessAnalysis?.ok === true ? Number(lockedThicknessAnalysis.gapMm.toFixed(6)) : null

  const captureProfilFrozenDimension = useCallback(
    (which: 1 | 2) => {
      setConstraintError(null)
      if (!model) {
        setConstraintError('needTwoFaces')
        return
      }
      const patches = partitionSelectionIntoCoplanarPatches(model, facesForStretch)
      if (patches.length !== 2) {
        setConstraintError('needTwoPlanarGroups')
        return
      }
      const pid = Date.now()
      const rand = Math.random().toString(36).slice(2, 6)
      const tag = which === 1 ? 'fz1' : 'fz2'
      const elementAId = `prz-${pid}-${rand}-${tag}-a`
      const elementBId = `prz-${pid}-${rand}-${tag}-b`
      const ua = [...patches[0]!]
      const ub = [...patches[1]!]
      ua.sort((x, y) => x - y)
      ub.sort((x, y) => x - y)
      onMergeModelElements([
        { id: elementAId, faceIndices: ua },
        { id: elementBId, faceIndices: ub },
      ])
      const pair = { a: elementAId, b: elementBId }
      if (which === 1) setProfilFrozenSlot1Ids(pair)
      else setProfilFrozenSlot2Ids(pair)
    },
    [facesForStretch, model, onMergeModelElements],
  )

  const capturePanelPlanePairForAxis = useCallback(
    (axis: 'x' | 'y') => {
      setConstraintError(null)
      if (!model) {
        setConstraintError('needTwoFaces')
        return
      }
      const patches = partitionSelectionIntoCoplanarPatches(model, facesForStretch)
      if (patches.length !== 2) {
        setConstraintError('needTwoPlanarGroups')
        return
      }
      const pid = Date.now()
      const rand = Math.random().toString(36).slice(2, 6)
      const tag = axis === 'x' ? 'x' : 'y'
      const elementAId = `pel-${pid}-${rand}-${tag}-a`
      const elementBId = `pel-${pid}-${rand}-${tag}-b`
      const ua = [...patches[0]!]
      const ub = [...patches[1]!]
      ua.sort((x, y) => x - y)
      ub.sort((x, y) => x - y)
      onMergeModelElements([
        { id: elementAId, faceIndices: ua },
        { id: elementBId, faceIndices: ub },
      ])
      const pair = { a: elementAId, b: elementBId }
      if (axis === 'x') setPanelCapturedPairX(pair)
      else setPanelCapturedPairY(pair)
    },
    [facesForStretch, model, onMergeModelElements],
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
      if (lockedPanelThicknessMm === null) {
        setConstraintError('needPanelThickness')
        return
      }
      if (!panelCapturedPairX) {
        setConstraintError('needPanelCapturedX')
        return
      }
      if (!panelYSameAsX && !panelCapturedPairY) {
        setConstraintError('needPanelCapturedY')
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
      const yPair = panelCapturedPairY
      const ya = panelYSameAsX ? xa : yPair!.a
      const yb = panelYSameAsX ? xb : yPair!.b
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
      if (!facePair || !model) {
        setConstraintError('needTwoFaces')
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
      const patches = partitionSelectionIntoCoplanarPatches(model, facesForStretch)
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
      const gapAn = analyzeTwoFaceStretch(model, facesForStretch)
      if (!gapAn.ok) {
        setConstraintError('needTwoPlanarGroups')
        return
      }
      const rawMm = naiveStretchMmAfterAddingProfil(gapAn.gapMm, valueMm, stretchMinMm)
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
    const ua = [...patches[0]]
    const ub = [...patches[1]]
    ua.sort((x, y) => x - y)
    ub.sort((x, y) => x - y)
    const repA = ua[0]!
    const repB = ub[0]!
    const next: FaceConstraint = {
      id,
      type: constraintType,
      facePair: { a: repA, b: repB },
      elementAId,
      elementBId,
      valueMm,
    } as FaceConstraint
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
    const rawMm = naiveStretchMmAfterAddingBasicConstraint(constraintType as 'min' | 'max' | 'const', valueMm, gapAn.gapMm)
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
    lockedPanelThicknessMm,
    panelXMax,
    panelXMin,
    panelXUseMin,
    panelYMax,
    panelYMin,
    panelYSameAsX,
    panelYUseMin,
    profilFrozenSlot1Ids,
    profilFrozenSlot2Ids,
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
      : i18n.exists(`rightPanel.constraints.errors.${constraintError}`)
        ? t(`rightPanel.constraints.errors.${constraintError}`)
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
                      stretchDistanceBoundHint !== null ? 'face-distance-bound-hint' : undefined
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
            {applyError && (
              <p className={styles.faceDistanceError} role="alert">
                {t(`rightPanel.faceDistance.errors.${applyError}`)}
              </p>
            )}
          </div>
        )}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('rightPanel.constraints.title')}</div>
          <p className={styles.faceDistanceHint}>{t('rightPanel.constraints.hint')}</p>
          <div className={styles.faceDistanceRow}>
            <label className={styles.faceDistanceLabel} htmlFor="constraint-type">
              {t('rightPanel.constraints.type')}
            </label>
            <select
              id="constraint-type"
              className={styles.faceDistanceInput}
              value={constraintType}
              onChange={(e) => setConstraintType(e.target.value as FaceConstraintType)}
            >
              <option value="min">MIN</option>
              <option value="max">MAX</option>
              <option value="const">CONST</option>
              <option value="profil">PROFIL</option>
              <option value="block">BLOCK</option>
              <option value="panel">PANEL</option>
            </select>
            {constraintType !== 'block' &&
              constraintType !== 'panel' &&
              constraintType !== 'profil' && (
              <div className={styles.faceDistanceInputWrap}>
                <input
                  className={styles.faceDistanceInput}
                  type="text"
                  inputMode="decimal"
                  value={constraintValue}
                  onChange={(e) => setConstraintValue(e.target.value)}
                  placeholder={t('rightPanel.constraints.valuePlaceholder')}
                />
                <span className={styles.faceDistanceUnit}>mm</span>
              </div>
            )}
            {constraintType === 'profil' && (
              <div className={styles.panelConstraintFields}>
                <p className={styles.panelWorkflowHint}>{t('rightPanel.constraints.profilWorkflowIntro')}</p>
                <div className={styles.faceDistanceInputWrap}>
                  <input
                    className={styles.faceDistanceInput}
                    type="text"
                    inputMode="decimal"
                    value={constraintValue}
                    onChange={(e) => setConstraintValue(e.target.value)}
                    placeholder={t('rightPanel.constraints.profilMaxStretchPlaceholder')}
                  />
                  <span className={styles.faceDistanceUnit}>mm</span>
                </div>
                <label className={styles.panelCheckboxRow}>
                  <input
                    type="checkbox"
                    checked={profilStretchUseMin}
                    onChange={(e) => setProfilStretchUseMin(e.target.checked)}
                  />
                  {t('rightPanel.constraints.profilStretchRestrictMin')}
                </label>
                {profilStretchUseMin && (
                  <div className={styles.faceDistanceInputWrap}>
                    <input
                      className={styles.faceDistanceInput}
                      type="text"
                      inputMode="decimal"
                      value={profilStretchMinMm}
                      onChange={(e) => setProfilStretchMinMm(e.target.value)}
                      placeholder={t('rightPanel.constraints.profilMinStretchPlaceholder')}
                    />
                    <span className={styles.faceDistanceUnit}>mm</span>
                  </div>
                )}
                <div className={styles.panelFieldGroup}>
                  <div className={styles.panelAxisLabel}>{t('rightPanel.constraints.profilFrozenDimsTitle')}</div>
                  <p className={styles.panelExtentsHintMuted}>{t('rightPanel.constraints.profilFrozenPickHint')}</p>
                  <button type="button" className={styles.panelCaptureBtn} onClick={() => captureProfilFrozenDimension(1)}>
                    {t('rightPanel.constraints.profilCaptureFrozen1')}
                  </button>
                  {profilFrozenSlot1Ids ? (
                    <p className={styles.panelExtentsMeasured}>
                      {t('rightPanel.constraints.panelCapturedPairOk', {
                        a: profilFrozenSlot1Ids.a,
                        b: profilFrozenSlot1Ids.b,
                      })}
                    </p>
                  ) : (
                    <p className={styles.panelExtentsHintMuted}>{t('rightPanel.constraints.panelNotCapturedYet')}</p>
                  )}
                  <button type="button" className={styles.panelCaptureBtn} onClick={() => captureProfilFrozenDimension(2)}>
                    {t('rightPanel.constraints.profilCaptureFrozen2')}
                  </button>
                  {profilFrozenSlot2Ids ? (
                    <p className={styles.panelExtentsMeasured}>
                      {t('rightPanel.constraints.panelCapturedPairOk', {
                        a: profilFrozenSlot2Ids.a,
                        b: profilFrozenSlot2Ids.b,
                      })}
                    </p>
                  ) : (
                    <p className={styles.panelExtentsHintMuted}>{t('rightPanel.constraints.panelNotCapturedYet')}</p>
                  )}
                  <p className={styles.panelExtentsHintMuted}>{t('rightPanel.constraints.profilStretchAfterFrozenHint')}</p>
                </div>
              </div>
            )}
            {constraintType === 'panel' && (
              <div className={styles.panelConstraintFields}>
                <p className={styles.panelWorkflowHint}>{t('rightPanel.constraints.panelWorkflowIntro')}</p>
                <div className={styles.panelFieldGroup}>
                  <div className={styles.panelAxisLabel}>{t('rightPanel.constraints.panelThicknessSection')}</div>
                  <p className={styles.panelExtentsHintMuted}>{t('rightPanel.constraints.panelThicknessFrozenHint')}</p>
                  <p className={styles.panelExtentsMeasured}>
                    {lockedPanelThicknessMm !== null
                      ? t('rightPanel.constraints.panelThicknessSelectionUnlockedForXY')
                      : t('rightPanel.constraints.panelThicknessLockPending')}
                  </p>
                  <div className={styles.faceDistanceInputWrap}>
                    <input
                      className={styles.faceDistanceInput}
                      type="text"
                      value={lockedPanelThicknessMm === null ? '' : String(lockedPanelThicknessMm)}
                      placeholder={t('rightPanel.constraints.panelThickness')}
                      readOnly
                    />
                    <span className={styles.faceDistanceUnit}>mm</span>
                  </div>
                </div>
                <div className={styles.panelFieldGroup}>
                  <div className={styles.panelAxisLabel}>{t('rightPanel.constraints.panelFacesForXTitle')}</div>
                  <p className={styles.panelExtentsHintMuted}>
                    {t(
                      lockedPanelThicknessMm !== null
                        ? 'rightPanel.constraints.panelFacesForXSpanHint'
                        : 'rightPanel.constraints.panelPickTwoPlanesHint',
                    )}
                  </p>
                  <button
                    type="button"
                    className={styles.panelCaptureBtn}
                    onClick={() => capturePanelPlanePairForAxis('x')}
                  >
                    {t('rightPanel.constraints.panelCapturePlanesX')}
                  </button>
                  {panelCapturedPairX ? (
                    <p className={styles.panelExtentsMeasured}>
                      {t('rightPanel.constraints.panelCapturedPairOk', {
                        a: panelCapturedPairX.a,
                        b: panelCapturedPairX.b,
                      })}
                    </p>
                  ) : (
                    <p className={styles.panelExtentsHintMuted}>{t('rightPanel.constraints.panelNotCapturedYet')}</p>
                  )}
                  <div className={styles.panelAxisLabel}>{t('rightPanel.constraints.panelAxisXLimitsTitle')}</div>
                  <div className={styles.faceDistanceInputWrap}>
                    <input
                      className={styles.faceDistanceInput}
                      type="text"
                      inputMode="decimal"
                      value={panelXMax}
                      onChange={(e) => setPanelXMax(e.target.value)}
                      placeholder={t('rightPanel.constraints.panelMaxPlaceholder')}
                    />
                    <span className={styles.faceDistanceUnit}>mm</span>
                  </div>
                  <label className={styles.panelCheckboxRow}>
                    <input
                      type="checkbox"
                      checked={panelXUseMin}
                      onChange={(e) => setPanelXUseMin(e.target.checked)}
                    />
                    {t('rightPanel.constraints.panelRestrictMin')}
                  </label>
                  {panelXUseMin && (
                    <div className={styles.faceDistanceInputWrap}>
                      <input
                        className={styles.faceDistanceInput}
                        type="text"
                        inputMode="decimal"
                        value={panelXMin}
                        onChange={(e) => setPanelXMin(e.target.value)}
                        placeholder={t('rightPanel.constraints.panelMinPlaceholder')}
                      />
                      <span className={styles.faceDistanceUnit}>mm</span>
                    </div>
                  )}
                </div>
                <label className={styles.panelCheckboxRow}>
                  <input
                    type="checkbox"
                    checked={panelYSameAsX}
                    onChange={(e) => setPanelYSameAsX(e.target.checked)}
                  />
                  {t('rightPanel.constraints.panelYSameAsX')}
                </label>
                {!panelYSameAsX && (
                  <div className={styles.panelFieldGroup}>
                    <div className={styles.panelAxisLabel}>{t('rightPanel.constraints.panelFacesForYTitle')}</div>
                    <p className={styles.panelExtentsHintMuted}>
                      {t(
                        lockedPanelThicknessMm !== null
                          ? 'rightPanel.constraints.panelFacesForYSpanHint'
                          : 'rightPanel.constraints.panelPickTwoPlanesHint',
                      )}
                    </p>
                    <button
                      type="button"
                      className={styles.panelCaptureBtn}
                      onClick={() => capturePanelPlanePairForAxis('y')}
                    >
                      {t('rightPanel.constraints.panelCapturePlanesY')}
                    </button>
                    {panelCapturedPairY ? (
                      <p className={styles.panelExtentsMeasured}>
                        {t('rightPanel.constraints.panelCapturedPairOk', {
                          a: panelCapturedPairY.a,
                          b: panelCapturedPairY.b,
                        })}
                      </p>
                    ) : (
                      <p className={styles.panelExtentsHintMuted}>{t('rightPanel.constraints.panelNotCapturedYet')}</p>
                    )}
                    <div className={styles.panelAxisLabel}>{t('rightPanel.constraints.panelAxisYLimitsTitle')}</div>
                    <div className={styles.faceDistanceInputWrap}>
                      <input
                        className={styles.faceDistanceInput}
                        type="text"
                        inputMode="decimal"
                        value={panelYMax}
                        onChange={(e) => setPanelYMax(e.target.value)}
                        placeholder={t('rightPanel.constraints.panelMaxPlaceholder')}
                      />
                      <span className={styles.faceDistanceUnit}>mm</span>
                    </div>
                    <label className={styles.panelCheckboxRow}>
                      <input
                        type="checkbox"
                        checked={panelYUseMin}
                        onChange={(e) => setPanelYUseMin(e.target.checked)}
                      />
                      {t('rightPanel.constraints.panelRestrictMin')}
                    </label>
                    {panelYUseMin && (
                      <div className={styles.faceDistanceInputWrap}>
                        <input
                          className={styles.faceDistanceInput}
                          type="text"
                          inputMode="decimal"
                          value={panelYMin}
                          onChange={(e) => setPanelYMin(e.target.value)}
                          placeholder={t('rightPanel.constraints.panelMinPlaceholder')}
                        />
                        <span className={styles.faceDistanceUnit}>mm</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <button type="button" className={styles.faceDistanceApply} onClick={handleAddConstraint}>
              {t('rightPanel.constraints.add')}
            </button>
            {constraintAddErrorText !== null && (
              <p className={styles.faceDistanceError} role="alert">
                {constraintAddErrorText}
              </p>
            )}
          </div>
          {faceConstraints.length === 0 ? (
            <p className={styles.selectionListEmpty}>{t('rightPanel.constraints.empty')}</p>
          ) : (
            <ul className={styles.selectionList}>
              {faceConstraints.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.type.toUpperCase()}
                    {' - '}
                    {item.type === 'panel'
                      ? `${formatPanelConstraintSummary(item)}${item.ySameAsX ? t('rightPanel.constraints.panelYSameBadge') : ''}${
                          item.panelMeasureMode === 'bboxExtents'
                            ? ` · (${t('rightPanel.constraints.panelMeasureBboxBadge')})`
                            : ` · X ${item.panelXElementAId ?? ''}↔${item.panelXElementBId ?? ''}; Y ${item.panelYElementAId ?? ''}↔${item.panelYElementBId ?? ''}`
                        }`
                      : item.type === 'profil'
                        ? `${formatProfilStretchGapLabelMm(item)} mm${
                            item.frozen1?.elementAId && item.frozen1.elementBId && item.frozen2?.elementAId && item.frozen2.elementBId
                              ? ` · ‖${item.frozen1.elementAId}↔${item.frozen1.elementBId} · ‖${item.frozen2.elementAId}↔${item.frozen2.elementBId}`
                              : ''
                          }`
                      : item.type === 'block'
                        ? t('rightPanel.constraints.blocked')
                        : `${item.valueMm} mm`}
                    {item.facePair ? ` (${item.facePair.a}, ${item.facePair.b})` : ''}
                  </span>
                  <button
                    type="button"
                    className={styles.constraintRemove}
                    onClick={() => handleRemoveConstraint(item.id)}
                  >
                    {t('rightPanel.constraints.remove')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
