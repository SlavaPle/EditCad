import { useTranslation } from 'react-i18next'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  onReset?: () => void
  onLoadModelClick?: () => void
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
] as const

export function Toolbar({ onReset, onLoadModelClick }: ToolbarProps) {
  const { t, i18n } = useTranslation()

  const handleLoad = () => {
    onLoadModelClick?.()
  }

  const handleExport = () => {
    // Placeholder — STL export in next step
    console.log('Export STL')
  }

  return (
    <header className={styles.toolbar}>
      <span className={styles.title}>{t('app.title')}</span>
      <div className={styles.toolbarGroup}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleLoad}>
          {t('toolbar.loadModel')}
        </button>
        <button type="button" className={styles.btn} onClick={handleExport}>
          {t('toolbar.exportStl')}
        </button>
        <div className={styles.toolbarDivider} />
        <button type="button" className={styles.btn} onClick={onReset}>
          {t('toolbar.reset')}
        </button>
        <div className={styles.toolbarDivider} />
        <select
          className={styles.langSelect}
          value={LANGUAGES.some((l) => l.code === i18n.language) ? i18n.language : 'en'}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          title="Language"
          aria-label="Language"
        >
          {LANGUAGES.map(({ code, label }) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </header>
  )
}
