import { useTranslation } from 'react-i18next'
import styles from './RightPanel.module.css'

export type PanelAxisMinMaxFieldsProps = {
  idPrefix: string
  useMin: boolean
  onUseMinChange: (next: boolean) => void
  minInput: string
  onMinInputChange: (next: string) => void
  maxInput: string
  onMaxInputChange: (next: string) => void
}

export function PanelAxisMinMaxFields({
  idPrefix,
  useMin,
  onUseMinChange,
  minInput,
  onMinInputChange,
  maxInput,
  onMaxInputChange,
}: PanelAxisMinMaxFieldsProps) {
  const { t } = useTranslation()

  return (
    <div className={styles.minMaxBoundsInputs}>
      <label className={styles.panelCheckboxRow}>
        <input type="checkbox" checked={useMin} onChange={(e) => onUseMinChange(e.target.checked)} />
        {t('rightPanel.limits.boundsUseMin')}
      </label>
      {useMin && (
        <div className={styles.faceDistanceInputWrap}>
          <label className={styles.visuallyHidden} htmlFor={`${idPrefix}-min`}>
            {t('rightPanel.limits.boundsMinMm')}
          </label>
          <input
            id={`${idPrefix}-min`}
            className={styles.faceDistanceInput}
            type="text"
            inputMode="decimal"
            value={minInput}
            onChange={(e) => onMinInputChange(e.target.value)}
            placeholder={t('rightPanel.limits.boundsMinMmPlaceholder')}
            title={t('rightPanel.limits.boundsMinMmHint')}
            aria-label={t('rightPanel.limits.boundsMinMm')}
          />
          <span className={styles.faceDistanceUnit}>{t('rightPanel.limits.boundsUnitMin')}</span>
        </div>
      )}
      <div className={styles.faceDistanceInputWrap}>
        <label className={styles.visuallyHidden} htmlFor={`${idPrefix}-max`}>
          {t('rightPanel.limits.boundsMaxMm')}
        </label>
        <input
          id={`${idPrefix}-max`}
          className={styles.faceDistanceInput}
          type="text"
          inputMode="decimal"
          value={maxInput}
          onChange={(e) => onMaxInputChange(e.target.value)}
          placeholder={t('rightPanel.limits.boundsMaxMm')}
          aria-label={t('rightPanel.limits.boundsMaxMm')}
        />
        <span className={styles.faceDistanceUnit}>{t('rightPanel.limits.boundsUnitMax')}</span>
      </div>
    </div>
  )
}
