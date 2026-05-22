import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { validateBindingsComplete } from '../bindings'
import type { PhantomAssemblyFile } from '../model'
import {
  formatAttachmentSource,
  formatConnectionSummary,
  formatElementLabel,
  formatEnvelopeSummary,
  formatParameterSource,
  formatResolvedEnvelopeAxes,
  resolvePhantomParamValuesForDisplay,
} from './panelFormatters'
import type { PreAssemblyPanelSelection } from './panelSelection'
import styles from './PreAssemblyPanels.module.css'

export type PreAssemblyTreePanelProps = {
  phantomDoc: PhantomAssemblyFile
  selection: PreAssemblyPanelSelection
  onSelectionChange: (next: PreAssemblyPanelSelection) => void
  onAddParameter?: () => void
  onAddConnection?: () => void
}

function isSelected(
  selection: PreAssemblyPanelSelection,
  kind: NonNullable<PreAssemblyPanelSelection>['kind'],
  id?: string,
): boolean {
  if (!selection || selection.kind !== kind) return false
  if (id === undefined) return true
  return 'id' in selection && selection.id === id
}

export function PreAssemblyTreePanel({
  phantomDoc,
  selection,
  onSelectionChange,
  onAddParameter,
  onAddConnection,
}: PreAssemblyTreePanelProps) {
  const { t } = useTranslation()
  const phantom = phantomDoc.phantom
  const paramValues = useMemo(
    () => resolvePhantomParamValuesForDisplay(phantom),
    [phantom],
  )
  const validation = useMemo(() => validateBindingsComplete(phantom), [phantom])
  const resolvedAxes = useMemo(
    () => formatResolvedEnvelopeAxes(phantom, t),
    [phantom, t],
  )

  const renderTreeButton = (
    key: string,
    label: string,
    secondary: string | null,
    nextSelection: PreAssemblyPanelSelection,
    selected: boolean,
  ) => (
    <li key={key}>
      <button
        type="button"
        className={`${styles.treeItemButton}${selected ? ` ${styles.treeItemButtonSelected}` : ''}`}
        onClick={() => onSelectionChange(nextSelection)}
      >
        {label}
        {secondary ? <span className={styles.treeItemSecondary}>{secondary}</span> : null}
      </button>
    </li>
  )

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{t('preAssembly.panels.tree.title')}</div>
      {!validation.ok && (
        <p className={styles.warning} role="status">
          {t('preAssembly.panels.tree.incomplete')}
        </p>
      )}
      <p className={styles.treeRootTitle}>
        {t('preAssembly.panels.tree.phantomRoot', {
          name: phantom.name ?? phantomDoc.name,
        })}
      </p>

      <div className={styles.treeGroup}>
        <div className={styles.sectionTitleRow}>
          <div className={styles.treeGroupLabel}>{t('preAssembly.panels.tree.parameters')}</div>
          {onAddParameter ? (
            <button type="button" className={styles.inlineAction} onClick={onAddParameter}>
              {t('preAssembly.panels.tree.addParameter')}
            </button>
          ) : null}
        </div>
        {phantom.parameters.length === 0 ? (
          <p className={styles.placeholder}>{t('preAssembly.panels.tree.parametersEmpty')}</p>
        ) : (
          <ul className={styles.treeList}>
            {phantom.parameters.map((param) =>
              renderTreeButton(
                param.id,
                param.name?.trim() || param.id,
                formatParameterSource(param, t),
                { kind: 'parameter', id: param.id },
                isSelected(selection, 'parameter', param.id),
              ),
            )}
          </ul>
        )}
      </div>

      <div className={styles.treeGroup}>
        <div className={styles.treeGroupLabel}>{t('preAssembly.panels.tree.envelope')}</div>
        <ul className={styles.treeList}>
          {renderTreeButton(
            'envelope',
            t('preAssembly.panels.tree.envelopeBox'),
            [
              formatEnvelopeSummary(phantom.envelope, t, paramValues ?? undefined),
              resolvedAxes,
            ]
              .filter(Boolean)
              .join(' · '),
            { kind: 'envelope' },
            isSelected(selection, 'envelope'),
          )}
        </ul>
      </div>

      <div className={styles.treeGroup}>
        <div className={styles.treeGroupLabel}>{t('preAssembly.panels.tree.attachments')}</div>
        {phantom.attachments.length === 0 ? (
          <p className={styles.placeholder}>{t('preAssembly.panels.tree.attachmentsEmpty')}</p>
        ) : (
          <ul className={styles.treeList}>
            {phantom.attachments.map((attachment) =>
              renderTreeButton(
                attachment.id,
                t(`preAssembly.panels.attachmentRole.${attachment.role}`),
                formatAttachmentSource(attachment, t),
                { kind: 'attachment', id: attachment.id },
                isSelected(selection, 'attachment', attachment.id),
              ),
            )}
          </ul>
        )}
      </div>

      <div className={styles.treeGroup}>
        <div className={styles.treeGroupLabel}>{t('preAssembly.panels.tree.elements')}</div>
        {phantom.elements.length === 0 ? (
          <p className={styles.placeholder}>{t('preAssembly.panels.tree.elementsEmpty')}</p>
        ) : (
          <ul className={styles.treeList}>
            {phantom.elements.map((slot) => {
              const anchor = phantom.attachments.find((a) => a.id === slot.anchorId)
              const anchorRole = anchor
                ? t(`preAssembly.panels.attachmentRole.${anchor.role}`)
                : slot.anchorId
              return renderTreeButton(
                slot.id,
                slot.name?.trim() || slot.ref,
                formatElementLabel(slot, t, anchorRole),
                { kind: 'element', id: slot.id },
                isSelected(selection, 'element', slot.id),
              )
            })}
          </ul>
        )}
      </div>

      <div className={styles.treeGroup}>
        <div className={styles.sectionTitleRow}>
          <div className={styles.treeGroupLabel}>{t('preAssembly.panels.tree.connections')}</div>
          {onAddConnection ? (
            <button type="button" className={styles.inlineAction} onClick={onAddConnection}>
              {t('preAssembly.panels.tree.addConnection')}
            </button>
          ) : null}
        </div>
        {phantom.connections.length === 0 ? (
          <p className={styles.placeholder}>{t('preAssembly.panels.tree.connectionsEmpty')}</p>
        ) : (
          <ul className={styles.treeList}>
            {phantom.connections.map((connection) =>
              renderTreeButton(
                connection.id,
                connection.id,
                formatConnectionSummary(connection, phantom, t, paramValues ?? undefined),
                { kind: 'connection', id: connection.id },
                isSelected(selection, 'connection', connection.id),
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
