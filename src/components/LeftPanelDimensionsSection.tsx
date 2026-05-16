import { useTranslation } from 'react-i18next'
import { leftPanelDimensionsPlaceholderI18nKey } from '../features/dimensions-panel/leftPanelDimensionsPlaceholderI18nKey'
import styles from './LeftPanel.module.css'

export interface LeftPanelDimensionsSectionProps {
  hasModel: boolean
}

export function LeftPanelDimensionsSection({ hasModel }: LeftPanelDimensionsSectionProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{t('leftPanel.dimensions.title')}</div>
      <p className={styles.placeholder}>{t(leftPanelDimensionsPlaceholderI18nKey(hasModel))}</p>
    </div>
  )
}
