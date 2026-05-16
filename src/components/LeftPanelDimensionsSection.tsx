import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { BufferGeometry } from 'three'
import type { PreparedModelElement } from '../lib/preparedElementFormat'
import type { FaceConstraint } from '../features/face-constraints/model'
import {
  elementaryPlaneGapRows,
  formatPlaneGapMmLabel,
} from '../features/dimensions-panel/elementaryLimitsUi'
import styles from './LeftPanel.module.css'

export interface LeftPanelDimensionsSectionProps {
  hasModel: boolean
  geometryRevision: number
  faceConstraints: FaceConstraint[]
  limitsSummaryGeometry: BufferGeometry | null
  limitsSummaryModelElements: readonly PreparedModelElement[]
}

export function LeftPanelDimensionsSection({
  hasModel,
  geometryRevision,
  faceConstraints,
  limitsSummaryGeometry,
  limitsSummaryModelElements,
}: LeftPanelDimensionsSectionProps) {
  const { t } = useTranslation()

  const planeGapRows = useMemo(
    () =>
      elementaryPlaneGapRows(limitsSummaryGeometry, faceConstraints, limitsSummaryModelElements),
    [limitsSummaryGeometry, faceConstraints, limitsSummaryModelElements],
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
            return (
              <li key={`${c.id}-${geometryRevision}`} className={styles.dimensionsListItem}>
                <div className={styles.dimensionsFieldRow}>
                  <label className={styles.dimensionsLabel} htmlFor={`dim-limit-${c.id}`}>
                    {c.type.toUpperCase()}
                  </label>
                  <input
                    id={`dim-limit-${c.id}`}
                    type="text"
                    className={styles.dimensionsInput}
                    defaultValue={gapStr}
                    title={c.id}
                    inputMode="decimal"
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
