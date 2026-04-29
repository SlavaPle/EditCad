import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BufferGeometry } from 'three'
import { useTranslation } from 'react-i18next'
import { analyzeTwoFaceStretch, type TwoFaceStretchError } from '../lib/twoFaceStretch'
import { getSelectionListEntries, type SelectionState } from '../lib/selection'
import type { FaceConstraint, FaceConstraintType } from '../features/face-constraints/model'
import { removeFaceConstraint, upsertFaceConstraint } from '../features/face-constraints/store'
import styles from './RightPanel.module.css'

export interface RightPanelProps {
  selection: SelectionState
  probableFaces?: readonly number[]
  model: BufferGeometry | null
  geometryRevision: number
  onApplyTwoFaceStretch: (
    targetMm: number,
  ) => { ok: true; geometry: BufferGeometry } | { ok: false; error: TwoFaceStretchError }
  faceConstraints: FaceConstraint[]
  onFaceConstraintsChange: (next: FaceConstraint[]) => void
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

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7882/ingest/cc58a8d9-c779-4012-82fb-05fda4bfad8c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '44a128' },
      body: JSON.stringify({
        sessionId: '44a128',
        runId: 'pre-fix',
        hypothesisId: 'H4',
        location: 'RightPanel.tsx:faceStretchState',
        message: 'Right panel distance block state',
        data: {
          facesForStretchCount: facesForStretch.length,
          selectionFacesCount: selection.faces.length,
          selectionEdgesCount: selection.edges.length,
          probableFacesCount: probableFaces.length,
          faceStretchSelection,
          analysisOk: analysis ? analysis.ok : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
  }, [
    facesForStretch.length,
    selection.faces.length,
    selection.edges.length,
    probableFaces.length,
    faceStretchSelection,
    analysis,
  ])

  const [targetInput, setTargetInput] = useState('')
  const [applyError, setApplyError] = useState<string | null>(null)
  const [constraintType, setConstraintType] = useState<FaceConstraintType>('min')
  const [constraintValue, setConstraintValue] = useState('')
  const [panelMinX, setPanelMinX] = useState('')
  const [panelMinY, setPanelMinY] = useState('')
  const [panelMaxX, setPanelMaxX] = useState('')
  const [panelMaxY, setPanelMaxY] = useState('')
  const [constraintError, setConstraintError] = useState<string | null>(null)
  const [constraintsLocked, setConstraintsLocked] = useState(false)

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
    if (constraintsLocked) {
      const currentPair =
        facesForStretch.length >= 2
          ? { a: Math.min(facesForStretch[0], facesForStretch[1]), b: Math.max(facesForStretch[0], facesForStretch[1]) }
          : null
      const pairConstraints = faceConstraints.filter((c) => {
        if (c.type === 'block') return true
        if (!currentPair || !c.facePair) return false
        return (
          (c.facePair.a === currentPair.a && c.facePair.b === currentPair.b) ||
          (c.facePair.a === currentPair.b && c.facePair.b === currentPair.a)
        )
      })
      if (pairConstraints.some((c) => c.type === 'block')) {
        setApplyError('lockedByBlock')
        return
      }
      const exact = pairConstraints.find((c) => c.type === 'const' || c.type === 'profil')
      if (exact && exact.type !== 'block' && exact.type !== 'panel') {
        if (Math.abs(mm - exact.valueMm) > 1e-6) {
          setApplyError('lockedExact')
          return
        }
      }
      const minBounds = pairConstraints.filter((c) => c.type === 'min').map((c) => c.valueMm)
      const maxBounds = pairConstraints.filter((c) => c.type === 'max').map((c) => c.valueMm)
      const minBound = minBounds.length > 0 ? Math.max(...minBounds) : null
      const maxBound = maxBounds.length > 0 ? Math.min(...maxBounds) : null
      if (minBound !== null && mm < minBound) {
        setApplyError('lockedMin')
        return
      }
      if (maxBound !== null && mm > maxBound) {
        setApplyError('lockedMax')
        return
      }
    }
    const result = onApplyTwoFaceStretch(mm)
    if (!result.ok) {
      setApplyError(result.error)
    }
  }, [constraintsLocked, faceConstraints, facesForStretch, onApplyTwoFaceStretch, targetInput])

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
      const minX = parsePositiveMm(panelMinX)
      const minY = parsePositiveMm(panelMinY)
      const maxX = parsePositiveMm(panelMaxX)
      const maxY = parsePositiveMm(panelMaxY)
      if (minX === null || minY === null || maxX === null || maxY === null) {
        setConstraintError('invalidValue')
        return
      }
      if (minX > maxX || minY > maxY) {
        setConstraintError('invalidRange')
        return
      }
      const next: FaceConstraint = {
        id,
        type: 'panel',
        facePair: null,
        thicknessMm: panelThicknessMm,
        minSizeMm: { x: minX, y: minY },
        maxSizeMm: { x: maxX, y: maxY },
      }
      onFaceConstraintsChange(upsertFaceConstraint(faceConstraints, next))
      return
    }

    if (!facePair) {
      setConstraintError('needTwoFaces')
      return
    }
    const valueMm = parsePositiveMm(constraintValue)
    if (valueMm === null) {
      setConstraintError('invalidValue')
      return
    }
    const next: FaceConstraint = { id, type: constraintType, facePair, valueMm } as FaceConstraint
    onFaceConstraintsChange(upsertFaceConstraint(faceConstraints, next))
  }, [
    constraintType,
    constraintValue,
    faceConstraints,
    facePair,
    onFaceConstraintsChange,
    panelMaxX,
    panelMaxY,
    panelMinX,
    panelMinY,
    panelThicknessMm,
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
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{t('rightPanel.constraints.title')}</span>
            <button
              type="button"
              className={styles.constraintLock}
              onClick={() => setConstraintsLocked((v) => !v)}
              title={
                constraintsLocked
                  ? t('rightPanel.constraints.locked')
                  : t('rightPanel.constraints.unlocked')
              }
            >
              {constraintsLocked ? '🔒' : '🔓'}
            </button>
          </div>
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
              <>
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
                <div className={styles.faceDistanceInputWrap}>
                  <input
                    className={styles.faceDistanceInput}
                    type="text"
                    inputMode="decimal"
                    value={panelMinX}
                    onChange={(e) => setPanelMinX(e.target.value)}
                    placeholder={t('rightPanel.constraints.panelMinX')}
                  />
                  <span className={styles.faceDistanceUnit}>mm</span>
                </div>
                <div className={styles.faceDistanceInputWrap}>
                  <input
                    className={styles.faceDistanceInput}
                    type="text"
                    inputMode="decimal"
                    value={panelMinY}
                    onChange={(e) => setPanelMinY(e.target.value)}
                    placeholder={t('rightPanel.constraints.panelMinY')}
                  />
                  <span className={styles.faceDistanceUnit}>mm</span>
                </div>
                <div className={styles.faceDistanceInputWrap}>
                  <input
                    className={styles.faceDistanceInput}
                    type="text"
                    inputMode="decimal"
                    value={panelMaxX}
                    onChange={(e) => setPanelMaxX(e.target.value)}
                    placeholder={t('rightPanel.constraints.panelMaxX')}
                  />
                  <span className={styles.faceDistanceUnit}>mm</span>
                </div>
                <div className={styles.faceDistanceInputWrap}>
                  <input
                    className={styles.faceDistanceInput}
                    type="text"
                    inputMode="decimal"
                    value={panelMaxY}
                    onChange={(e) => setPanelMaxY(e.target.value)}
                    placeholder={t('rightPanel.constraints.panelMaxY')}
                  />
                  <span className={styles.faceDistanceUnit}>mm</span>
                </div>
              </>
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
                      ? `t=${item.thicknessMm} mm; min=${item.minSizeMm.x}x${item.minSizeMm.y}; max=${item.maxSizeMm.x}x${item.maxSizeMm.y}`
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
