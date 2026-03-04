import { useTranslation } from 'react-i18next'
import type { ModelSelectionInteractionMode } from '../features/model-selection/types'
import styles from './RightPanel.module.css'

export interface RightPanelProps {
  selectionInteractionMode: ModelSelectionInteractionMode
  onSelectionInteractionModeChange: (mode: ModelSelectionInteractionMode) => void
}

export function RightPanel({
  selectionInteractionMode,
  onSelectionInteractionModeChange,
}: RightPanelProps) {
  const { t } = useTranslation()

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>{t('rightPanel.header')}</div>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('rightPanel.selection.title')}</div>
          <fieldset className={styles.selectionFieldset}>
            <label className={styles.radioRow}>
              <input
                type="radio"
                name="selectionInteraction"
                value="facePlane"
                checked={selectionInteractionMode === 'facePlane'}
                onChange={() => onSelectionInteractionModeChange('facePlane')}
              />
              <span>{t('rightPanel.selection.facePlane')}</span>
            </label>
            <label className={styles.radioRow}>
              <input
                type="radio"
                name="selectionInteraction"
                value="edgeLine"
                checked={selectionInteractionMode === 'edgeLine'}
                onChange={() => onSelectionInteractionModeChange('edgeLine')}
              />
              <span>{t('rightPanel.selection.edgeLine')}</span>
            </label>
          </fieldset>
          <p className={styles.selectionHint}>{t('rightPanel.selection.hint')}</p>
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('rightPanel.scale')}</div>
          <p className={styles.placeholder}>{t('rightPanel.scaleHint')}</p>
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('rightPanel.rotation')}</div>
          <p className={styles.placeholder}>{t('rightPanel.rotationHint')}</p>
        </div>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('rightPanel.colorTexture')}</div>
          <p className={styles.placeholder}>{t('rightPanel.colorTextureHint')}</p>
        </div>
      </div>
    </aside>
  )
}
