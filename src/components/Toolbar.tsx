import { Fragment } from 'react'
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
import type { PreAssemblyToolbarUi, PreAssemblyWizard } from '../features/pre-assembly'
import { getPreAssemblySaveTitleKey } from '../features/pre-assembly'
interface ToolbarProps {
  activeToolbarTab?: ToolbarTabId
  onActiveToolbarTabChange?: (tabId: ToolbarTabId) => void
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
  preAssemblyToolbarUi?: PreAssemblyToolbarUi
  preAssemblyWizard?: PreAssemblyWizard
  onLoadAssemblyClick?: () => void
  onSaveAssemblyClick?: () => void
  onSaveAssemblyAsClick?: () => void
  onLoadPhantomClick?: () => void
  onSavePhantomClick?: () => void
  onSavePhantomAsClick?: () => void
  onCreatePhantom?: () => void
  onAddPart?: () => void
  onCreateAttachment?: () => void
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' }
] as const

export function Toolbar({
  activeToolbarTab = DEFAULT_TOOLBAR_TAB_ID,
  onActiveToolbarTabChange,
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
  preAssemblyToolbarUi,
  preAssemblyWizard = null,
  onLoadAssemblyClick,
  onSaveAssemblyClick,
  onSaveAssemblyAsClick,
  onLoadPhantomClick,
  onSavePhantomClick,
  onSavePhantomAsClick,
  onCreatePhantom,
  onAddPart,
  onCreateAttachment,
}: ToolbarProps) {
  const { t, i18n } = useTranslation()
  const activeTabId = activeToolbarTab

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
      case 'paste':
        return (
          <button
            key={actionId}
            type="button"
            className={styles.iconBtn}
            disabled
            title={t('toolbar.paste')}
            aria-label={t('toolbar.paste')}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M6.5 3.5h7a1.5 1.5 0 011.5 1.5v1h-10V5a1.5 1.5 0 011.5-1.5zM5 6.5h10a1.5 1.5 0 011.5 1.5v8a1.5 1.5 0 01-1.5 1.5H5a1.5 1.5 0 01-1.5-1.5V8a1.5 1.5 0 011.5-1.5zm3.2 4.2h3.6v1.2H8.2V10.7zm0 2.4h3.6v1.2H8.2v-1.2z"
                  fill="currentColor"
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
      case 'loadAssembly':
        return (
          <button
            key={actionId}
            type="button"
            className={`${styles.iconBtn} ${styles.btnPrimary}`}
            title={t('preAssembly.loadAssembly.button')}
            aria-label={t('preAssembly.loadAssembly.button')}
            onClick={() => onLoadAssemblyClick?.()}
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
      case 'saveAssembly':
        return (
          <button
            key={actionId}
            type="button"
            className={styles.iconBtn}
            disabled={!preAssemblyToolbarUi?.canSaveAssembly}
            title={t('preAssembly.saveAssembly.button')}
            aria-label={t('preAssembly.saveAssembly.button')}
            onClick={() => onSaveAssemblyClick?.()}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 2.5h11l3 3V17.5H3V2.5zM6 4.5V9h7V4.5H6zm0 7V15h8v-3.5H6z" fill="currentColor" />
              </svg>
            </span>
          </button>
        )
      case 'saveAssemblyAs':
        return (
          <button
            key={actionId}
            type="button"
            className={styles.iconBtn}
            disabled={!preAssemblyToolbarUi?.canSaveAssembly}
            title={t('preAssembly.saveAssemblyAs.button')}
            aria-label={t('preAssembly.saveAssemblyAs.button')}
            onClick={() => onSaveAssemblyAsClick?.()}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M3 2.5h11l3 3V17.5H3V2.5zM6 4.5V9h7V4.5H6zm0 7V15h8v-3.5H6z"
                  fill="currentColor"
                />
                <path
                  d="M12.5 3v3.5H16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        )
      case 'loadPhantom':
        return (
          <button
            key={actionId}
            type="button"
            className={`${styles.iconBtn} ${styles.btnPrimary}`}
            title={t('preAssembly.loadPhantom.button')}
            aria-label={t('preAssembly.loadPhantom.button')}
            onClick={() => onLoadPhantomClick?.()}
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
      case 'savePhantom': {
        const saveTitleKey = preAssemblyToolbarUi
          ? getPreAssemblySaveTitleKey(preAssemblyToolbarUi)
          : 'preAssembly.savePhantom.button'
        return (
          <button
            key={actionId}
            type="button"
            className={styles.iconBtn}
            disabled={!preAssemblyToolbarUi || preAssemblyToolbarUi.saveDisabled}
            title={t(saveTitleKey)}
            aria-label={t(saveTitleKey)}
            onClick={() => onSavePhantomClick?.()}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 2.5h11l3 3V17.5H3V2.5zM6 4.5V9h7V4.5H6zm0 7V15h8v-3.5H6z" fill="currentColor" />
              </svg>
            </span>
          </button>
        )
      }
      case 'savePhantomAs':
        return (
          <button
            key={actionId}
            type="button"
            className={styles.iconBtn}
            disabled={!preAssemblyToolbarUi?.hasPhantom || !!preAssemblyToolbarUi?.saveDisabled}
            title={t('preAssembly.savePhantomAs.button')}
            aria-label={t('preAssembly.savePhantomAs.button')}
            onClick={() => onSavePhantomAsClick?.()}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M3 2.5h11l3 3V17.5H3V2.5zM6 4.5V9h7V4.5H6zm0 7V15h8v-3.5H6z"
                  fill="currentColor"
                />
                <path
                  d="M12.5 3v3.5H16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        )
      case 'createPhantom':
        return (
          <button
            key={actionId}
            type="button"
            className={`${styles.iconBtn} ${preAssemblyToolbarUi?.hasPhantom ? styles.iconBtnActive : ''}`}
            title={t('preAssembly.createPhantom.button')}
            aria-label={t('preAssembly.createPhantom.button')}
            aria-pressed={!!preAssemblyToolbarUi?.hasPhantom}
            onClick={() => onCreatePhantom?.()}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M4 6l6-3 6 3v8l-6 3-6-3V6z" fill="currentColor" fillOpacity="0.35" />
                <path d="M10 3v14M4 6l6 3 6-3M4 14l6 3 6-3" />
                <path d="M14 2.5v5M11.5 5h5" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        )
      case 'addPart':
        return (
          <button
            key={actionId}
            type="button"
            className={`${styles.iconBtn} ${styles.textActionBtn} ${styles.textActionBtnPrimary}`}
            title={t('preAssembly.addPart.button')}
            aria-label={t('preAssembly.addPart.button')}
            onClick={() => onAddPart?.()}
          >
            {t('preAssembly.addPart.button')}
          </button>
        )
      case 'createAttachment': {
        const attachmentActive = preAssemblyWizard === 'attachment'
        return (
          <button
            key={actionId}
            type="button"
            className={`${styles.iconBtn} ${attachmentActive ? styles.iconBtnActive : ''}`}
            disabled={!preAssemblyToolbarUi || preAssemblyToolbarUi.createAttachmentDisabled}
            title={
              attachmentActive
                ? t('preAssembly.createAttachment.active')
                : t('preAssembly.createAttachment.button')
            }
            aria-label={
              attachmentActive
                ? t('preAssembly.createAttachment.active')
                : t('preAssembly.createAttachment.button')
            }
            aria-pressed={attachmentActive}
            onClick={() => onCreateAttachment?.()}
          >
            <span className={styles.icon}>
              <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="3.5" y="8" width="13" height="0.01" fill="currentColor" stroke="currentColor" />
                <path d="M3.5 8h13" strokeLinecap="round" />
                <path d="M10 4v8" strokeLinecap="round" strokeDasharray="1.5 1.5" />
              </svg>
            </span>
          </button>
        )
      }
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
            {activeTab?.actions.map((actionId) => (
              <Fragment key={actionId}>
                {actionId === 'paste' && <div className={styles.toolbarDivider} aria-hidden="true" />}
                {renderActionButton(actionId)}
              </Fragment>
            ))}
          </div>
          <div className={styles.toolbarGroup}>
            {renderActionButton('settings')}
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
        </div>
        <div className={styles.tabsRow}>
          {TOOLBAR_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${tab.id === activeTabId ? styles.tabActive : ''}`}
              onClick={() => onActiveToolbarTabChange?.(tab.id)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
