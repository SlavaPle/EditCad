import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BufferGeometry } from 'three'
import { useTranslation } from 'react-i18next'
import { analyzeTwoFaceStretch, type TwoFaceStretchError } from '../lib/twoFaceStretch'
import { getSelectionListEntries, type SelectionState } from '../lib/selection'
import styles from './RightPanel.module.css'

export interface RightPanelProps {
  selection: SelectionState
  probableFaces?: readonly number[]
  model: BufferGeometry | null
  geometryRevision: number
  onApplyTwoFaceStretch: (
    targetMm: number,
  ) => { ok: true; geometry: BufferGeometry } | { ok: false; error: TwoFaceStretchError }
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
  const [applyError, setApplyError] = useState<TwoFaceStretchError | null>(null)

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
