import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BufferGeometry } from 'three'
import type { PreparedModelElement } from '../lib/preparedElementFormat'
import type { FaceConstraint } from '../features/face-constraints/model'
import {
  elementaryPlaneGapRows,
  formatPlaneGapMmLabel,
  type ElementaryFaceConstraint,
} from '../features/dimensions-panel/elementaryLimitsUi'
import { resolveTriangleIndicesForConstraint } from '../features/part-constraints/resolveConstraintFaces'
import {
  applyTargetDistanceFromInput,
  type ApplyTwoFaceStretchFn,
} from '../lib/applyTargetDistanceFromInput'
import styles from './LeftPanel.module.css'

export interface LeftPanelDimensionsSectionProps {
  hasModel: boolean
  geometryRevision: number
  faceConstraints: FaceConstraint[]
  limitsSummaryGeometry: BufferGeometry | null
  limitsSummaryModelElements: readonly PreparedModelElement[]
  onApplyTwoFaceStretch: ApplyTwoFaceStretchFn
}

export function LeftPanelDimensionsSection({
  hasModel,
  geometryRevision,
  faceConstraints,
  limitsSummaryGeometry,
  limitsSummaryModelElements,
  onApplyTwoFaceStretch,
}: LeftPanelDimensionsSectionProps) {
  const { t, i18n } = useTranslation()
  const [draftByConstraintId, setDraftByConstraintId] = useState<Record<string, string>>({})
  const [applyErrorByConstraintId, setApplyErrorByConstraintId] = useState<Record<string, string>>(
    {},
  )

  const planeGapRows = useMemo(
    () =>
      elementaryPlaneGapRows(limitsSummaryGeometry, faceConstraints, limitsSummaryModelElements),
    [limitsSummaryGeometry, faceConstraints, limitsSummaryModelElements, geometryRevision],
  )

  useEffect(() => {
    setDraftByConstraintId(
      Object.fromEntries(
        planeGapRows.map(({ constraint, gapMm }) => [constraint.id, formatPlaneGapMmLabel(gapMm)]),
      ),
    )
    setApplyErrorByConstraintId({})
  }, [geometryRevision, planeGapRows])

  const applyDimensionRow = useCallback(
    (c: ElementaryFaceConstraint, inputText: string) => {
      const mergedFaces = resolveTriangleIndicesForConstraint(c, limitsSummaryModelElements)
      if (!mergedFaces || mergedFaces.length < 2) return
      const result = applyTargetDistanceFromInput(inputText, onApplyTwoFaceStretch, {
        mergedFaces: [...mergedFaces],
      })
      if (!result.ok) {
        setApplyErrorByConstraintId((prev) => ({ ...prev, [c.id]: result.error }))
        return
      }
      setDraftByConstraintId((prev) => ({
        ...prev,
        [c.id]: formatPlaneGapMmLabel(result.effectiveTargetMm),
      }))
      setApplyErrorByConstraintId((prev) => {
        if (!(c.id in prev)) return prev
        const next = { ...prev }
        delete next[c.id]
        return next
      })
    },
    [limitsSummaryModelElements, onApplyTwoFaceStretch],
  )

  if (!hasModel) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('leftPanel.dimensions.title')}</div>
        <p className={styles.placeholder}>{t('leftPanel.dimensions.placeholderNoModel')}</p>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{t('leftPanel.dimensions.title')}</div>

      {planeGapRows.length === 0 ? (
        <p className={styles.placeholder}>{t('leftPanel.dimensions.elementaryEmpty')}</p>
      ) : (
        <ul className={styles.dimensionsList} aria-label={t('leftPanel.dimensions.elementaryListAria')}>
          {planeGapRows.map(({ constraint: c, gapMm }) => {
            const gapStr = formatPlaneGapMmLabel(gapMm)
            const value = draftByConstraintId[c.id] ?? gapStr
            const rowError = applyErrorByConstraintId[c.id]
            const isConst = c.type === 'const'
            return (
              <li key={`${c.id}-${geometryRevision}`} className={styles.dimensionsListItem}>
                <div className={styles.dimensionsFieldRow}>
                  <label className={styles.dimensionsLabel} htmlFor={`dim-limit-${c.id}`}>
                    {c.type === 'minmax' ? t('leftPanel.dimensions.typeMinMaxLabel') : c.type.toUpperCase()}
                  </label>
                  <input
                    id={`dim-limit-${c.id}`}
                    type="text"
                    className={styles.dimensionsInput}
                    value={value}
                    onChange={(e) => {
                      const v = e.target.value
                      setDraftByConstraintId((prev) => ({ ...prev, [c.id]: v }))
                      setApplyErrorByConstraintId((prev) => {
                        if (!(c.id in prev)) return prev
                        const next = { ...prev }
                        delete next[c.id]
                        return next
                      })
                    }}
                    onKeyDown={(e) => {
                      if (isConst || e.key !== 'Enter') return
                      e.preventDefault()
                      applyDimensionRow(c, value)
                    }}
                    title={c.id}
                    inputMode="decimal"
                    disabled={isConst}
                    aria-invalid={Boolean(rowError)}
                  />
                </div>
                {rowError !== undefined && (
                  <p className={styles.dimensionsApplyError} role="alert">
                    {i18n.exists(`rightPanel.faceDistance.errors.${rowError}`)
                      ? t(`rightPanel.faceDistance.errors.${rowError}`)
                      : rowError}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
