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
import { applyDimensionGapFromInput } from '../features/dimensions-panel/applyDimensionGapFromInput'
import { formatDimensionGapErrorMessage } from '../features/dimensions-panel/formatDimensionGapErrorMessage'
import type { ApplyTwoFaceStretchFn } from '../lib/applyTargetDistanceFromInput'
import { validateDimensionGapInput } from '../features/dimensions-panel/validateDimensionGapInput'
import type { StretchBasicEnvelope } from '../features/part-constraints/stretchBasicEnvelopeForMergedPair'
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
  const [applyErrorByConstraintId, setApplyErrorByConstraintId] = useState<
    Record<string, { code: string; envelope: StretchBasicEnvelope | null }>
  >({})

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

  const dimensionValidationContext = useCallback(
    (c: ElementaryFaceConstraint) => ({
      geometry: limitsSummaryGeometry,
      mergedFaces: resolveTriangleIndicesForConstraint(c, limitsSummaryModelElements),
      faceConstraints,
      modelElements: limitsSummaryModelElements,
    }),
    [limitsSummaryGeometry, limitsSummaryModelElements, faceConstraints],
  )

  const setRowValidationError = useCallback(
    (constraintId: string, code: string, envelope: StretchBasicEnvelope | null) => {
      setApplyErrorByConstraintId((prev) => ({ ...prev, [constraintId]: { code, envelope } }))
    },
    [],
  )

  const clearRowValidationError = useCallback((constraintId: string) => {
    setApplyErrorByConstraintId((prev) => {
      if (!(constraintId in prev)) return prev
      const next = { ...prev }
      delete next[constraintId]
      return next
    })
  }, [])

  const validateDimensionRowDraft = useCallback(
    (c: ElementaryFaceConstraint, inputText: string) => {
      const result = validateDimensionGapInput({
        inputText,
        ...dimensionValidationContext(c),
      })
      if (!result.ok) {
        setRowValidationError(c.id, result.error, result.envelope)
        return false
      }
      clearRowValidationError(c.id)
      return true
    },
    [clearRowValidationError, dimensionValidationContext, setRowValidationError],
  )

  const applyDimensionRow = useCallback(
    (c: ElementaryFaceConstraint, inputText: string) => {
      const mergedFaces = resolveTriangleIndicesForConstraint(c, limitsSummaryModelElements)
      if (!mergedFaces || mergedFaces.length < 2) return
      const result = applyDimensionGapFromInput(
        { inputText, ...dimensionValidationContext(c) },
        onApplyTwoFaceStretch,
      )
      if (!result.ok) {
        setRowValidationError(c.id, result.error, result.envelope)
        return
      }
      setDraftByConstraintId((prev) => ({
        ...prev,
        [c.id]: formatPlaneGapMmLabel(result.effectiveTargetMm),
      }))
      clearRowValidationError(c.id)
    },
    [
      clearRowValidationError,
      dimensionValidationContext,
      limitsSummaryModelElements,
      onApplyTwoFaceStretch,
      setRowValidationError,
    ],
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
            const rowErrorMessage =
              rowError !== undefined
                ? formatDimensionGapErrorMessage(t, i18n, rowError.code, rowError.envelope)
                : undefined
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
                      clearRowValidationError(c.id)
                    }}
                    onBlur={() => {
                      if (isConst) return
                      validateDimensionRowDraft(c, value)
                    }}
                    onKeyDown={(e) => {
                      if (isConst || e.key !== 'Enter') return
                      e.preventDefault()
                      if (!validateDimensionRowDraft(c, value)) return
                      applyDimensionRow(c, value)
                    }}
                    title={c.id}
                    inputMode="decimal"
                    disabled={isConst}
                    aria-invalid={Boolean(rowError)}
                  />
                </div>
                {rowErrorMessage !== undefined && (
                  <p className={styles.dimensionsApplyError} role="alert">
                    {rowErrorMessage}
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
