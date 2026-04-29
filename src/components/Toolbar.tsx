import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './Toolbar.module.css'
import {
  DEFAULT_TOOLBAR_TAB_ID,
  TOOLBAR_TABS,
  type ToolbarActionId,
  type ToolbarTabId
} from './ToolbarTabsConfig'

interface ToolbarProps {
  onLoadModelClick?: () => void
  onSaveModelClick?: () => void
  onSaveAsModelClick?: () => void
  hasModel?: boolean
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' }
] as const

export function Toolbar({
  onLoadModelClick,
  onSaveModelClick,
  onSaveAsModelClick,
  hasModel = false,
}: ToolbarProps) {
  const { t, i18n } = useTranslation()
  const [activeTabId, setActiveTabId] = useState<ToolbarTabId>(DEFAULT_TOOLBAR_TAB_ID)

  const handleLoad = () => {
    onLoadModelClick?.()
  }

  const handleExport = () => {
    onSaveModelClick?.()
  }
  const handleSaveAs = () => {
    onSaveAsModelClick?.()
  }

  const renderActionButton = (actionId: ToolbarActionId) => {
    switch (actionId) {
      case 'open':
        return (
          <button
            key={actionId}
            type="button"
            className={`${styles.iconBtn} ${styles.btnPrimary}`}
            onClick={handleLoad}
            title={t('toolbar.open')}
            aria-label={t('toolbar.open')}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M3 5h4l2 2h8v8H3V5zm2 2v6h10V9H8.5L6.5 7H5z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </button>
        )
      case 'save':
        return (
          <button
            key={actionId}
            type="button"
            className={styles.iconBtn}
            onClick={handleExport}
            disabled={!hasModel}
            title={t('toolbar.save')}
            aria-label={t('toolbar.save')}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M4 3h9l3 3v11H4V3zm2 2v4h8V5H6zm0 6v4h8v-4H6z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </button>
        )
      case 'settings':
        return (
          <button
            key={actionId}
            type="button"
            className={styles.iconBtn}
            title={t('toolbar.settings')}
            aria-label={t('toolbar.settings')}
            onClick={() => {
              // Placeholder for future settings handling
              console.log('Open settings')
            }}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M10 6.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zm0-4.5l1.2 2.4 2.7-.3.4 2.7 2.4 1.2-1.5 2.3 1.5 2.3-2.4 1.2-.4 2.7-2.7-.3L10 18l-1.2-2.4-2.7.3-.4-2.7L3.3 13l1.5-2.3L3.3 8.4l2.4-1.2.4-2.7 2.7.3L10 2z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </button>
        )
      case 'editConstrain':
        return (
          <button
            key={actionId}
            type="button"
            className={styles.iconBtn}
            title={t('toolbar.editConstrain')}
            aria-label={t('toolbar.editConstrain')}
            onClick={() => {
              // Placeholder for future edit-constrain handling
              console.log('Edit constraints')
            }}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M4 4h2v12H4V4zm10 0h2v12h-2V4zM8 9h4v2H8V9z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </button>
        )
      case 'saveAs':
        return (
          <button
            key={actionId}
            type="button"
            className={styles.iconBtn}
            onClick={handleSaveAs}
            disabled={!hasModel}
            title={t('toolbar.saveAs')}
            aria-label={t('toolbar.saveAs')}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M4 3h9l3 3v11H4V3zm2 2v4h8V5H6zm0 6v4h8v-4H6zm3-8h2v3H9V3z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </button>
        )
      default:
        return null
    }
  }

  const activeTab = TOOLBAR_TABS.find((tab) => tab.id === activeTabId) ?? TOOLBAR_TABS[0]

  return (
    <header className={styles.toolbar}>
      <div className={styles.toolbarTitle}>
        <span className={styles.title}>{t('app.title')}</span>
      </div>
      <div className={styles.toolbarRight}>
        <div className={styles.toolbarContent}>
          <div className={styles.toolbarGroup}>
            {activeTab?.actions.map((actionId) => renderActionButton(actionId))}
          </div>
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
        <div className={styles.tabsRow}>
          {TOOLBAR_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${tab.id === activeTabId ? styles.tabActive : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
