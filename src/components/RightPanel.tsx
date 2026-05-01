import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BufferGeometry } from 'three'
import { useTranslation } from 'react-i18next'
import { analyzeTwoFaceStretch, type TwoFaceStretchError } from '../lib/twoFaceStretch'
import { partitionSelectionIntoCoplanarPatches } from '../features/model-selection/facePlaneSelection'
import { getSelectionListEntries, type SelectionState } from '../lib/selection'
import type { PreparedStretchPrecheckError } from '../lib/preparedStretchValidation'
import type { PreparedModelElement } from '../lib/preparedElementFormat'
import {
  formatPanelConstraintSummary,
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
  onApplyTwoFaceStretch: (
    targetMm: number,
  ) =>
    | { ok: true; geometry: BufferGeometry }
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

export function RightPanel({
  selection,
  probableFaces = [],
  model,
  geometryRevision,
  onApplyTwoFaceStretch,
  faceConstraints,
  onFaceConstraintsChange,
  onMergeModelElements,
}: RightPanelProps) {
  const { t } = useTranslation()
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

  const [targetInput, setTargetInput] = useState('')
  const [applyError, setApplyError] = useState<string | null>(null)
  const [constraintType, setConstraintType] = useState<FaceConstraintType>('min')
  const [constraintValue, setConstraintValue] = useState('')
  const [panelXUseMin, setPanelXUseMin] = useState(false)
  const [panelXMin, setPanelXMin] = useState('')
  const [panelXMax, setPanelXMax] = useState('')
  const [panelYSameAsX, setPanelYSameAsX] = useState(false)
  const [panelYUseMin, setPanelYUseMin] = useState(false)
  const [panelYMin, setPanelYMin] = useState('')
  const [panelYMax, setPanelYMax] = useState('')
  const [constraintError, setConstraintError] = useState<string | null>(null)

  useEffect(() => {
    setApplyError(null)
  }, [selection, geometryRevision])

  useEffect(() => {
    if (!analysis || !analysis.ok) {
      return
    }
    setTargetInput(String(Number(analysis.gapMm.toFixed(6))))
  }, [analysis])

  const handleApply = useCallback(() => {
    const mm = parsePositiveMm(targetInput)
    if (mm === null) {
      setApplyError('invalidTarget')
      return
    }
    const result = onApplyTwoFaceStretch(mm)
    if (!result.ok) {
      setApplyError(result.error)
    }
  }, [onApplyTwoFaceStretch, targetInput])

  const facePair =
    facesForStretch.length >= 2 ? { a: Math.min(facesForStretch[0], facesForStretch[1]), b: Math.max(facesForStretch[0], facesForStretch[1]) } : null
  const panelThicknessMm = analysis?.ok ? Number(analysis.gapMm.toFixed(6)) : null

  const handleAddConstraint = useCallback(() => {
    const id = `${constraintType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setConstraintError(null)

    if (constraintType === 'block') {
      const next: FaceConstraint = { id, type: 'block', facePair: null }
      onFaceConstraintsChange(upsertFaceConstraint(faceConstraints, next))
      return
    }

    if (constraintType === 'panel') {
      if (panelThicknessMm === null) {
        setConstraintError('needPanelThickness')
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

      const next: FaceConstraint = {
        id,
        type: 'panel',
        facePair: null,
        thicknessMm: panelThicknessMm,
        panelX: panelXBounds,
        panelY: panelYBounds,
        ySameAsX,
      }
      onFaceConstraintsChange(upsertFaceConstraint(faceConstraints, next))
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
    onMergeModelElements([
      { id: elementAId, faceIndices: ua },
      { id: elementBId, faceIndices: ub },
    ])
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
    onFaceConstraintsChange(upsertFaceConstraint(faceConstraints, next))
  }, [
    constraintType,
    constraintValue,
    faceConstraints,
    facePair,
    facesForStretch,
    model,
    onFaceConstraintsChange,
    onMergeModelElements,
    panelThicknessMm,
    panelXMax,
    panelXMin,
    panelXUseMin,
    panelYMax,
    panelYMin,
    panelYSameAsX,
    panelYUseMin,
  ])

  const handleRemoveConstraint = useCallback(
    (id: string) => {
      onFaceConstraintsChange(removeFaceConstraint(faceConstraints, id))
    },
    [faceConstraints, onFaceConstraintsChange],
  )

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
                  />
                  <span className={styles.faceDistanceUnit}>mm</span>
                </div>
                <button type="button" className={styles.faceDistanceApply} onClick={handleApply}>
                  {t('rightPanel.faceDistance.apply')}
                </button>
              </div>
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
            {constraintType !== 'block' && constraintType !== 'panel' && (
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
            {constraintType === 'panel' && (
              <div className={styles.panelConstraintFields}>
                <div className={styles.faceDistanceInputWrap}>
                  <input
                    className={styles.faceDistanceInput}
                    type="text"
                    value={panelThicknessMm === null ? '' : String(panelThicknessMm)}
                    placeholder={t('rightPanel.constraints.panelThickness')}
                    readOnly
                  />
                  <span className={styles.faceDistanceUnit}>mm</span>
                </div>
                <div className={styles.panelFieldGroup}>
                  <div className={styles.panelAxisLabel}>{t('rightPanel.constraints.panelAxisX')}</div>
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
                    <div className={styles.panelAxisLabel}>{t('rightPanel.constraints.panelAxisY')}</div>
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
            {constraintError && (
              <p className={styles.faceDistanceError} role="alert">
                {t(`rightPanel.constraints.errors.${constraintError}`)}
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
                      ? `${formatPanelConstraintSummary(item)}${item.ySameAsX ? t('rightPanel.constraints.panelYSameBadge') : ''}`
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
