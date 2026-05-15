import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './Toolbar.module.css'
import {
  DEFAULT_MODEL_DISPLAY_MODE,
  type ModelDisplayMode,
} from '../features/viewer-display/modelDisplayMode'
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
  limitsInstallActive?: boolean
  limitsAddDisabled?: boolean
  onToggleLimitsInstall?: () => void
  appearanceEditActive?: boolean
  onToggleAppearanceEdit?: () => void
  displayMode?: ModelDisplayMode
  onDisplayModeChange?: (mode: ModelDisplayMode) => void
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
  limitsInstallActive = false,
  limitsAddDisabled = false,
  onToggleLimitsInstall,
  appearanceEditActive = false,
  onToggleAppearanceEdit,
  displayMode = DEFAULT_MODEL_DISPLAY_MODE,
  onDisplayModeChange,
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
                <path d="M3 2.5h11l3 3V17.5H3V2.5zM6 4.5V9h7V4.5H6zm0 7V15h8v-3.5H6z" fill="currentColor" />
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
      case 'editAppearance':
        return (
          <button
            key={actionId}
            type="button"
            className={`${styles.iconBtn} ${appearanceEditActive ? styles.iconBtnActive : ''}`}
            title={
              appearanceEditActive
                ? t('toolbar.appearance.active')
                : t('toolbar.appearance.button')
            }
            aria-label={
              appearanceEditActive
                ? t('toolbar.appearance.active')
                : t('toolbar.appearance.button')
            }
            aria-pressed={appearanceEditActive}
            disabled={!hasModel}
            onClick={() => onToggleAppearanceEdit?.()}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M10 3.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zm0 2a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM4 16.5c0-2.8 2.7-5 6-5s6 2.2 6 5v.5H4v-.5z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </button>
        )
      case 'editLimits':
        return (
          <button
            key={actionId}
            type="button"
            className={`${styles.iconBtn} ${limitsInstallActive ? styles.iconBtnActive : ''}`}
            title={
              limitsInstallActive
                ? t('toolbar.limitsActive')
                : t('toolbar.limits')
            }
            aria-label={
              limitsInstallActive
                ? t('toolbar.limitsActive')
                : t('toolbar.limits')
            }
            aria-pressed={limitsInstallActive}
            disabled={!hasModel || (limitsAddDisabled && !limitsInstallActive)}
            onClick={() => onToggleLimitsInstall?.()}
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
                  d="M3 2.5h11l3 3V17.5H3V2.5zM6 4.5V9h7V4.5H6zm0 7V15h8v-3.5H6z"
                  fill="currentColor"
                />
                <rect x="11.1" y="11.1" width="6.3" height="6.3" rx="0.8" fill="#1e293b" />
                <path
                  d="M12.9 11.9h2.7v1.9h1.9v2.7h-1.9v1.9h-2.7v-1.9h-1.9v-2.7h1.9v-1.9z"
                  fill="#ffffff"
                  stroke="#0b1220"
                  strokeWidth="0.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        )
      case 'viewEdgesOnly':
        return (
          <button
            key={actionId}
            type="button"
            className={`${styles.iconBtn} ${displayMode === 'edgesOnly' ? styles.iconBtnActive : ''}`}
            disabled={!hasModel}
            title={t('toolbar.view.edgesOnly')}
            aria-label={t('toolbar.view.edgesOnly')}
            aria-pressed={displayMode === 'edgesOnly'}
            onClick={() => onDisplayModeChange?.('edgesOnly')}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M4 6l6-3 6 3v8l-6 3-6-3V6z" />
                <path d="M10 3v14M4 6l6 3 6-3M4 14l6 3 6-3" />
              </svg>
            </span>
          </button>
        )
      case 'viewSolid':
        return (
          <button
            key={actionId}
            type="button"
            className={`${styles.iconBtn} ${displayMode === 'solid' ? styles.iconBtnActive : ''}`}
            disabled={!hasModel}
            title={t('toolbar.view.solid')}
            aria-label={t('toolbar.view.solid')}
            aria-pressed={displayMode === 'solid'}
            onClick={() => onDisplayModeChange?.('solid')}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4 6l6-3 6 3v8l-6 3-6-3V6z" fill="currentColor" />
              </svg>
            </span>
          </button>
        )
      case 'viewSolidTextured':
        return (
          <button
            key={actionId}
            type="button"
            className={`${styles.iconBtn} ${displayMode === 'solidTextured' ? styles.iconBtnActive : ''}`}
            disabled={!hasModel}
            title={t('toolbar.view.solidTextured')}
            aria-label={t('toolbar.view.solidTextured')}
            aria-pressed={displayMode === 'solidTextured'}
            onClick={() => onDisplayModeChange?.('solidTextured')}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4 6l6-3 6 3v8l-6 3-6-3V6z" fill="currentColor" fillOpacity="0.9" />
                <path
                  d="M5 8h3v3H5V8zm7 0h3v3h-3V8zM5 12h3v2H5v-2zm7 0h3v2h-3v-2z"
                  fill="#0f172a"
                  fillOpacity="0.45"
                />
              </svg>
            </span>
          </button>
        )
      case 'viewSolidWithEdges':
        return (
          <button
            key={actionId}
            type="button"
            className={`${styles.iconBtn} ${displayMode === 'solidWithEdges' ? styles.iconBtnActive : ''}`}
            disabled={!hasModel}
            title={t('toolbar.view.solidWithEdges')}
            aria-label={t('toolbar.view.solidWithEdges')}
            aria-pressed={displayMode === 'solidWithEdges'}
            onClick={() => onDisplayModeChange?.('solidWithEdges')}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M4 6l6-3 6 3v8l-6 3-6-3V6z" fill="currentColor" fillOpacity="0.85" />
                <path d="M4 6l6 3 6-3M4 14l6 3 6-3M10 3v14" />
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
