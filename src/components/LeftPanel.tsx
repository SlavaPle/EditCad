import { useTranslation } from 'react-i18next'
import styles from './LeftPanel.module.css'

export function LeftPanel() {
  const { t } = useTranslation()

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>{t('leftPanel.header')}</div>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('leftPanel.file')}</div>
          <p className={styles.placeholder}>{t('leftPanel.dropHint')}</p>
        </div>
      </div>
    </aside>
  )
}
