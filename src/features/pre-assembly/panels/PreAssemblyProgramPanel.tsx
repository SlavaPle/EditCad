import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import { buildProgramPartDisplayNameById } from '../programParts/programPartDisplayName'
import styles from './PreAssemblyPanels.module.css'

export type PreAssemblyProgramPanelProps = {
  programParts: readonly PreAssemblyProgramPart[]
  assemblySourceFileName?: string | null
  programLoadError?: string | null
  programSaveMessage?: string | null
  onAddPart?: () => void
  onRemovePart?: (partId: string) => void
}

export function PreAssemblyProgramPanel({
  programParts,
  assemblySourceFileName = null,
  programLoadError = null,
  programSaveMessage = null,
  onAddPart,
  onRemovePart,
}: PreAssemblyProgramPanelProps) {
  const { t } = useTranslation()
  const displayNameById = useMemo(
    () => buildProgramPartDisplayNameById(programParts),
    [programParts],
  )

  return (
    <div className={styles.section}>
      {assemblySourceFileName ? (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t('preAssembly.panels.program.assemblyFile')}</div>
          <p className={styles.treeRootTitle} title={assemblySourceFileName}>
            {assemblySourceFileName}
          </p>
        </div>
      ) : null}
      {programSaveMessage ? (
        <p className={styles.success} role="status">
          {programSaveMessage}
        </p>
      ) : null}
      {programLoadError ? (
        <p className={styles.error} role="alert">
          {programLoadError}
        </p>
      ) : null}
      <p className={styles.placeholder}>{t('preAssembly.panels.program.manipulationHint')}</p>
      <div className={styles.sectionTitleRow}>
        <div className={styles.sectionTitle}>{t('preAssembly.panels.program.title')}</div>
        {onAddPart ? (
          <button type="button" className={styles.inlineAction} onClick={onAddPart}>
            {t('preAssembly.panels.program.addPart')}
          </button>
        ) : null}
      </div>
      {programParts.length === 0 ? (
        <p className={styles.placeholder}>{t('preAssembly.panels.program.empty')}</p>
      ) : (
        <ul className={styles.treeList}>
          {programParts.map((part) => (
            <li key={part.id}>
              <div className={styles.programPartRow}>
                <button type="button" className={styles.treeItemButton}>
                  <span>{displayNameById[part.id] ?? part.name}</span>
                  <span className={styles.treeItemSecondary}>{part.ref}</span>
                </button>
                {onRemovePart ? (
                  <button
                    type="button"
                    className={styles.inlineAction}
                    onClick={() => onRemovePart(part.id)}
                    title={t('preAssembly.panels.program.remove')}
                    aria-label={t('preAssembly.panels.program.remove')}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
