import { useTranslation } from 'react-i18next'
import styles from './MatesPopup.module.css'

export type MateFlipSelectProps = {
  flipped: boolean
  disabled?: boolean
  onChange: (flipped: boolean) => void
}

/** Checkbox: unchecked = rozwiązanie 0, checked = rozwiązanie 1. */
export function MateFlipSelect({ flipped, disabled = false, onChange }: MateFlipSelectProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.fieldRow}>
      <span className={styles.planeLabel}>{t('mates.flip.label')}</span>
      <label className={styles.flipLabel}>
        <input
          type="checkbox"
          checked={flipped}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {t('mates.flip.toggle')}
      </label>
    </div>
  )
}
