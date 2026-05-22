import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  AttachmentAnchor,
  BoxFaceId,
  ConnectionEndpoint,
  ElementConnection,
  PhantomAssemblyFile,
  PhantomElementSlot,
  PhantomParameter,
} from '../model'
import { isBoxPhantomEnvelope } from '../model'
import {
  ATTACHMENT_ROLES,
  BOX_FACE_IDS,
  addAttachment,
  addConnection,
  addElementSlot,
  addParameter,
  removeAttachment,
  removeConnection,
  removeElementSlot,
  removeParameter,
  updateAttachment,
  updateConnection,
  updateElementSlot,
  updateEnvelope,
  updateParameter,
  updatePhantomInFile,
} from '../phantomStore'
import type { PreAssemblyWizard } from '../toolbarActions'
import { DimensionSpecField } from './DimensionSpecField'
import { formatDimensionSpec } from './panelFormatters'
import type { PreAssemblyPanelSelection } from './panelSelection'
import styles from './PreAssemblyPanels.module.css'

export type PreAssemblyRightPanelProps = {
  phantomDoc: PhantomAssemblyFile
  onPhantomDocChange: (next: PhantomAssemblyFile) => void
  selection: PreAssemblyPanelSelection
  onSelectionChange: (next: PreAssemblyPanelSelection) => void
  wizard: PreAssemblyWizard
  onWizardDone?: () => void
}

function parseOffsetTriple(raw: string): [number, number, number] | undefined {
  const parts = raw.split(',').map((s) => Number(s.trim()))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return undefined
  return [parts[0]!, parts[1]!, parts[2]!]
}

function formatOffsetTriple(offset?: [number, number, number]): string {
  if (!offset) return '0, 0, 0'
  return offset.map((n) => String(n)).join(', ')
}

export function PreAssemblyRightPanel({
  phantomDoc,
  onPhantomDocChange,
  selection,
  onSelectionChange,
  wizard,
  onWizardDone,
}: PreAssemblyRightPanelProps) {
  const { t } = useTranslation()
  const phantom = phantomDoc.phantom
  const [formError, setFormError] = useState<string | null>(null)

  const applyPhantom = useCallback(
    (nextPhantom: typeof phantom) => {
      onPhantomDocChange(updatePhantomInFile(phantomDoc, nextPhantom))
    },
    [onPhantomDocChange, phantomDoc],
  )

  const attachmentDraftDefaults = useMemo(
    () => ({
      role: 'floor' as const,
      face: 'posY' as const,
    }),
    [],
  )

  const [attachmentRole, setAttachmentRole] = useState(attachmentDraftDefaults.role)
  const [attachmentFace, setAttachmentFace] = useState(attachmentDraftDefaults.face)
  const [attachmentSourceKind, setAttachmentSourceKind] = useState<'boxFace' | 'offsetPlane'>(
    'boxFace',
  )
  const [attachmentOffsetMm, setAttachmentOffsetMm] = useState('0')

  const [elementRef, setElementRef] = useState('')
  const [elementName, setElementName] = useState('')
  const [elementAnchorId, setElementAnchorId] = useState(
    () => phantom.attachments[0]?.id ?? '',
  )
  const [elementReplaceable, setElementReplaceable] = useState(false)

  useEffect(() => {
    if (elementAnchorId) return
    const first = phantom.attachments[0]?.id
    if (first) setElementAnchorId(first)
  }, [elementAnchorId, phantom.attachments])

  const handleAddAttachment = useCallback(() => {
    setFormError(null)
    const source =
      attachmentSourceKind === 'boxFace'
        ? { kind: 'boxFace' as const, face: attachmentFace }
        : {
            kind: 'offsetPlane' as const,
            face: attachmentFace,
            offsetMm: Number(attachmentOffsetMm) || 0,
          }
    const result = addAttachment(phantom, { role: attachmentRole, source })
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    applyPhantom(result.phantom)
    const created = result.phantom.attachments[result.phantom.attachments.length - 1]
    if (created) onSelectionChange({ kind: 'attachment', id: created.id })
    onWizardDone?.()
  }, [
    applyPhantom,
    attachmentFace,
    attachmentOffsetMm,
    attachmentRole,
    attachmentSourceKind,
    onSelectionChange,
    onWizardDone,
    phantom,
  ])

  const handleAddElement = useCallback(() => {
    setFormError(null)
    const result = addElementSlot(phantom, {
      ref: elementRef,
      name: elementName.trim() || undefined,
      anchorId: elementAnchorId,
      replaceable: elementReplaceable || undefined,
      variants: elementReplaceable ? [{ id: 'v1', ref: elementRef.trim() }] : undefined,
      activeVariantId: elementReplaceable ? 'v1' : undefined,
    })
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    applyPhantom(result.phantom)
    const created = result.phantom.elements[result.phantom.elements.length - 1]
    if (created) onSelectionChange({ kind: 'element', id: created.id })
    setElementRef('')
    setElementName('')
    onWizardDone?.()
  }, [
    applyPhantom,
    elementAnchorId,
    elementName,
    elementRef,
    elementReplaceable,
    onSelectionChange,
    onWizardDone,
    phantom,
  ])

  if (wizard === 'attachment') {
    return (
      <div className={styles.section}>
        <h3 className={styles.editorTitle}>{t('preAssembly.panels.wizard.addAttachment')}</h3>
        <p className={styles.hint}>{t('preAssembly.panels.wizard.addAttachmentHint')}</p>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="wizard-attachment-role">
            {t('preAssembly.panels.attachment.role')}
          </label>
          <select
            id="wizard-attachment-role"
            className={styles.fieldSelect}
            value={attachmentRole}
            onChange={(e) => setAttachmentRole(e.target.value as typeof attachmentRole)}
          >
            {ATTACHMENT_ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`preAssembly.panels.attachmentRole.${role}`)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="wizard-attachment-source">
            {t('preAssembly.panels.attachment.sourceKind')}
          </label>
          <select
            id="wizard-attachment-source"
            className={styles.fieldSelect}
            value={attachmentSourceKind}
            onChange={(e) =>
              setAttachmentSourceKind(e.target.value as 'boxFace' | 'offsetPlane')
            }
          >
            <option value="boxFace">{t('preAssembly.panels.attachment.sourceKindBoxFace')}</option>
            <option value="offsetPlane">
              {t('preAssembly.panels.attachment.sourceKindOffsetPlane')}
            </option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="wizard-attachment-face">
            {t('preAssembly.panels.attachment.face')}
          </label>
          <select
            id="wizard-attachment-face"
            className={styles.fieldSelect}
            value={attachmentFace}
            onChange={(e) => setAttachmentFace(e.target.value as typeof attachmentFace)}
          >
            {BOX_FACE_IDS.map((face) => (
              <option key={face} value={face}>
                {t(`preAssembly.panels.boxFace.${face}`)}
              </option>
            ))}
          </select>
        </div>
        {attachmentSourceKind === 'offsetPlane' && (
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="wizard-attachment-offset">
              {t('preAssembly.panels.attachment.offsetMm')}
            </label>
            <div className={styles.fieldRow}>
              <input
                id="wizard-attachment-offset"
                className={styles.fieldInput}
                type="text"
                inputMode="decimal"
                value={attachmentOffsetMm}
                onChange={(e) => setAttachmentOffsetMm(e.target.value)}
              />
              <span className={styles.fieldUnit}>mm</span>
            </div>
          </div>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={handleAddAttachment}>
            {t('preAssembly.panels.actions.create')}
          </button>
        </div>
        {formError && (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        )}
      </div>
    )
  }

  if (wizard === 'element') {
    return (
      <div className={styles.section}>
        <h3 className={styles.editorTitle}>{t('preAssembly.panels.wizard.addElement')}</h3>
        <p className={styles.hint}>{t('preAssembly.panels.wizard.addElementHint')}</p>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="wizard-element-ref">
            {t('preAssembly.panels.element.ref')}
          </label>
          <input
            id="wizard-element-ref"
            className={styles.fieldInput}
            type="text"
            value={elementRef}
            onChange={(e) => setElementRef(e.target.value)}
            placeholder={t('preAssembly.panels.element.refPlaceholder')}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="wizard-element-name">
            {t('preAssembly.panels.element.name')}
          </label>
          <input
            id="wizard-element-name"
            className={styles.fieldInput}
            type="text"
            value={elementName}
            onChange={(e) => setElementName(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="wizard-element-anchor">
            {t('preAssembly.panels.element.anchor')}
          </label>
          <select
            id="wizard-element-anchor"
            className={styles.fieldSelect}
            value={elementAnchorId}
            onChange={(e) => setElementAnchorId(e.target.value)}
          >
            {phantom.attachments.map((a) => (
              <option key={a.id} value={a.id}>
                {t(`preAssembly.panels.attachmentRole.${a.role}`)} ({a.id})
              </option>
            ))}
          </select>
        </div>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={elementReplaceable}
            onChange={(e) => setElementReplaceable(e.target.checked)}
          />
          {t('preAssembly.panels.element.replaceable')}
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleAddElement}
            disabled={!elementRef.trim() || !elementAnchorId}
          >
            {t('preAssembly.panels.actions.create')}
          </button>
        </div>
        {formError && (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        )}
      </div>
    )
  }

  if (!selection) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('preAssembly.panels.editor.title')}</div>
        <p className={styles.placeholder}>{t('preAssembly.panels.editor.selectHint')}</p>
      </div>
    )
  }

  if (selection.kind === 'envelope') {
    const envelope = phantom.envelope
    if (!isBoxPhantomEnvelope(envelope)) {
      return (
        <div className={styles.section}>
          <h3 className={styles.editorTitle}>{t('preAssembly.panels.envelope.editorTitle')}</h3>
          <p className={styles.placeholder}>
            {t('preAssembly.panels.envelope.phase2ReadOnly', { kind: envelope.kind })}
          </p>
        </div>
      )
    }
    const isPanel = envelope.phantomKind === 'panel'
    const isCube = envelope.phantomKind === 'cube'
    return (
      <div className={styles.section}>
        <h3 className={styles.editorTitle}>{t('preAssembly.panels.envelope.editorTitle')}</h3>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="envelope-phantom-kind">
            {t('preAssembly.panels.envelope.phantomKindLabel')}
          </label>
          <select
            id="envelope-phantom-kind"
            className={styles.fieldSelect}
            value={envelope.phantomKind}
            onChange={(e) => {
              const phantomKind = e.target.value as 'panel' | 'cube'
              const patch =
                phantomKind === 'panel'
                  ? { phantomKind, thicknessAxis: envelope.thicknessAxis ?? ('z' as const) }
                  : { phantomKind, thicknessAxis: undefined }
              const result = updateEnvelope(phantom, patch)
              if (result.ok) applyPhantom(result.phantom)
            }}
          >
            <option value="panel">{t('preAssembly.panels.envelope.phantomKind.panel')}</option>
            <option value="cube">{t('preAssembly.panels.envelope.phantomKind.cube')}</option>
          </select>
        </div>
        <DimensionSpecField
          id="envelope-width"
          label={
            isPanel
              ? t('preAssembly.panels.envelope.spanWidth')
              : t('preAssembly.panels.envelope.width')
          }
          value={envelope.widthMm}
          parameters={phantom.parameters}
          onChange={(widthMm) => {
            const result = updateEnvelope(phantom, { widthMm })
            if (result.ok) applyPhantom(result.phantom)
          }}
        />
        <DimensionSpecField
          id="envelope-height"
          label={
            isPanel
              ? t('preAssembly.panels.envelope.spanHeight')
              : t('preAssembly.panels.envelope.height')
          }
          value={envelope.heightMm}
          parameters={phantom.parameters}
          onChange={(heightMm) => {
            const result = updateEnvelope(phantom, { heightMm })
            if (result.ok) applyPhantom(result.phantom)
          }}
        />
        {isCube && (
          <DimensionSpecField
            id="envelope-depth"
            label={t('preAssembly.panels.envelope.depth')}
            value={envelope.depthMm}
            parameters={phantom.parameters}
            onChange={(depthMm) => {
              const result = updateEnvelope(phantom, { depthMm })
              if (result.ok) applyPhantom(result.phantom)
            }}
          />
        )}
        {isPanel && (
          <>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                {t('preAssembly.panels.envelope.thickness', {
                  axis: (envelope.thicknessAxis ?? 'z').toUpperCase(),
                })}
              </label>
              <input
                className={styles.fieldInput}
                type="text"
                readOnly
                value={formatDimensionSpec(envelope.depthMm, t)}
                aria-readonly
              />
              <p className={styles.hint}>{t('preAssembly.panels.envelope.thicknessHint')}</p>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="envelope-thickness-axis">
                {t('preAssembly.panels.envelope.thicknessAxis')}
              </label>
              <select
                id="envelope-thickness-axis"
                className={styles.fieldSelect}
                value={envelope.thicknessAxis ?? 'z'}
                onChange={(e) => {
                  const result = updateEnvelope(phantom, {
                    thicknessAxis: e.target.value as 'x' | 'y' | 'z',
                  })
                  if (result.ok) applyPhantom(result.phantom)
                }}
              >
                <option value="x">X</option>
                <option value="y">Y</option>
                <option value="z">Z</option>
              </select>
            </div>
          </>
        )}
      </div>
    )
  }

  if (selection.kind === 'parameter') {
    const param = phantom.parameters.find((p) => p.id === selection.id)
    if (!param) {
      return (
        <p className={styles.placeholder}>{t('preAssembly.panels.editor.notFound')}</p>
      )
    }
    const updateParam = (next: PhantomParameter) => {
      const result = updateParameter(phantom, param.id, next)
      if (result.ok) applyPhantom(result.phantom)
    }
    return (
      <div className={styles.section}>
        <h3 className={styles.editorTitle}>{t('preAssembly.panels.parameter.editorTitle')}</h3>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="param-id">
            {t('preAssembly.panels.common.id')}
          </label>
          <input id="param-id" className={styles.fieldInput} type="text" value={param.id} readOnly />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="param-name">
            {t('preAssembly.panels.common.name')}
          </label>
          <input
            id="param-name"
            className={styles.fieldInput}
            type="text"
            value={param.name ?? ''}
            onChange={(e) => updateParam({ ...param, name: e.target.value || undefined })}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="param-kind">
            {t('preAssembly.panels.parameter.sourceKind')}
          </label>
          <select
            id="param-kind"
            className={styles.fieldSelect}
            value={param.kind}
            onChange={(e) => {
              const kind = e.target.value
              if (kind === 'literal') {
                updateParam({ id: param.id, name: param.name, kind: 'literal', valueMm: 0 })
              } else if (kind === 'fromElement') {
                const elementId = phantom.elements[0]?.id ?? 'element'
                updateParam({
                  id: param.id,
                  name: param.name,
                  kind: 'fromElement',
                  elementId,
                  property: 'thickness',
                })
              }
            }}
          >
            <option value="literal">{t('preAssembly.panels.parameter.kindLiteral')}</option>
            <option value="fromElement">{t('preAssembly.panels.parameter.kindFromElement')}</option>
          </select>
        </div>
        {param.kind === 'literal' && (
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="param-value">
              {t('preAssembly.panels.parameter.valueMm')}
            </label>
            <div className={styles.fieldRow}>
              <input
                id="param-value"
                className={styles.fieldInput}
                type="text"
                inputMode="decimal"
                value={String(param.valueMm)}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) updateParam({ ...param, valueMm: n })
                }}
              />
              <span className={styles.fieldUnit}>mm</span>
            </div>
          </div>
        )}
        {param.kind === 'fromElement' && (
          <>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="param-element">
                {t('preAssembly.panels.parameter.elementId')}
              </label>
              <select
                id="param-element"
                className={styles.fieldSelect}
                value={param.elementId}
                onChange={(e) => updateParam({ ...param, elementId: e.target.value })}
              >
                {phantom.elements.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.name?.trim() || slot.ref} ({slot.id})
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="param-property">
                {t('preAssembly.panels.parameter.property')}
              </label>
              <select
                id="param-property"
                className={styles.fieldSelect}
                value={param.property}
                onChange={(e) =>
                  updateParam({
                    ...param,
                    property: e.target.value as typeof param.property,
                  })
                }
              >
                {(
                  [
                    'thickness',
                    'width',
                    'height',
                    'depth',
                    'bboxMinX',
                    'bboxMaxX',
                    'bboxMinY',
                    'bboxMaxY',
                    'bboxMinZ',
                    'bboxMaxZ',
                  ] as const
                ).map((prop) => (
                  <option key={prop} value={prop}>
                    {t(`preAssembly.panels.elementProperty.${prop}`)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={() => {
              const result = removeParameter(phantom, param.id)
              if (result.ok) {
                applyPhantom(result.phantom)
                onSelectionChange(null)
              }
            }}
          >
            {t('preAssembly.panels.actions.remove')}
          </button>
        </div>
      </div>
    )
  }

  if (selection.kind === 'attachment') {
    const attachment = phantom.attachments.find((a) => a.id === selection.id)
    if (!attachment) {
      return (
        <p className={styles.placeholder}>{t('preAssembly.panels.editor.notFound')}</p>
      )
    }
    const updateAnchor = (next: AttachmentAnchor) => {
      const result = updateAttachment(phantom, attachment.id, next)
      if (result.ok) applyPhantom(result.phantom)
    }
    return (
      <div className={styles.section}>
        <h3 className={styles.editorTitle}>{t('preAssembly.panels.attachment.editorTitle')}</h3>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t('preAssembly.panels.common.id')}</label>
          <input className={styles.fieldInput} type="text" value={attachment.id} readOnly />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="attachment-role">
            {t('preAssembly.panels.attachment.role')}
          </label>
          <select
            id="attachment-role"
            className={styles.fieldSelect}
            value={attachment.role}
            onChange={(e) =>
              updateAnchor({ ...attachment, role: e.target.value as AttachmentAnchor['role'] })
            }
          >
            {ATTACHMENT_ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`preAssembly.panels.attachmentRole.${role}`)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="attachment-source-kind">
            {t('preAssembly.panels.attachment.sourceKind')}
          </label>
          <select
            id="attachment-source-kind"
            className={styles.fieldSelect}
            value={attachment.source.kind}
            onChange={(e) => {
              const kind = e.target.value as 'boxFace' | 'offsetPlane'
              if (kind === 'boxFace') {
                const face =
                  attachment.source.kind === 'boxFace'
                    ? attachment.source.face
                    : attachment.source.face
                updateAnchor({ ...attachment, source: { kind: 'boxFace', face } })
              } else {
                const face =
                  attachment.source.kind === 'offsetPlane'
                    ? attachment.source.face
                    : attachment.source.face
                updateAnchor({
                  ...attachment,
                  source: {
                    kind: 'offsetPlane',
                    face,
                    offsetMm:
                      attachment.source.kind === 'offsetPlane'
                        ? attachment.source.offsetMm
                        : 0,
                  },
                })
              }
            }}
          >
            <option value="boxFace">{t('preAssembly.panels.attachment.sourceKindBoxFace')}</option>
            <option value="offsetPlane">
              {t('preAssembly.panels.attachment.sourceKindOffsetPlane')}
            </option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="attachment-face">
            {t('preAssembly.panels.attachment.face')}
          </label>
          <select
            id="attachment-face"
            className={styles.fieldSelect}
            value={attachment.source.face}
            onChange={(e) => {
              const face = e.target.value as BoxFaceId
              if (attachment.source.kind === 'boxFace') {
                updateAnchor({ ...attachment, source: { kind: 'boxFace', face } })
              } else {
                updateAnchor({
                  ...attachment,
                  source: { ...attachment.source, face },
                })
              }
            }}
          >
            {BOX_FACE_IDS.map((face) => (
              <option key={face} value={face}>
                {t(`preAssembly.panels.boxFace.${face}`)}
              </option>
            ))}
          </select>
        </div>
        {attachment.source.kind === 'offsetPlane' && (
          <DimensionSpecField
            id="attachment-offset"
            label={t('preAssembly.panels.attachment.offsetMm')}
            value={attachment.source.offsetMm}
            parameters={phantom.parameters}
            onChange={(offsetMm) => {
              if (attachment.source.kind !== 'offsetPlane') return
              updateAnchor({
                ...attachment,
                source: { ...attachment.source, offsetMm },
              })
            }}
          />
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={() => {
              const result = removeAttachment(phantom, attachment.id)
              if (!result.ok) {
                setFormError(result.error)
                return
              }
              applyPhantom(result.phantom)
              onSelectionChange(null)
            }}
          >
            {t('preAssembly.panels.actions.remove')}
          </button>
        </div>
        {formError && (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        )}
      </div>
    )
  }

  if (selection.kind === 'element') {
    const slot = phantom.elements.find((e) => e.id === selection.id)
    if (!slot) {
      return (
        <p className={styles.placeholder}>{t('preAssembly.panels.editor.notFound')}</p>
      )
    }
    const updateSlot = (next: PhantomElementSlot) => {
      const result = updateElementSlot(phantom, slot.id, next)
      if (result.ok) applyPhantom(result.phantom)
      else setFormError(result.error)
    }
    return (
      <div className={styles.section}>
        <h3 className={styles.editorTitle}>{t('preAssembly.panels.element.editorTitle')}</h3>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t('preAssembly.panels.common.id')}</label>
          <input className={styles.fieldInput} type="text" value={slot.id} readOnly />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="element-name-edit">
            {t('preAssembly.panels.element.name')}
          </label>
          <input
            id="element-name-edit"
            className={styles.fieldInput}
            type="text"
            value={slot.name ?? ''}
            onChange={(e) => updateSlot({ ...slot, name: e.target.value || undefined })}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="element-ref-edit">
            {t('preAssembly.panels.element.ref')}
          </label>
          <input
            id="element-ref-edit"
            className={styles.fieldInput}
            type="text"
            value={slot.ref}
            onChange={(e) => updateSlot({ ...slot, ref: e.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="element-anchor-edit">
            {t('preAssembly.panels.element.anchor')}
          </label>
          <select
            id="element-anchor-edit"
            className={styles.fieldSelect}
            value={slot.anchorId}
            onChange={(e) => updateSlot({ ...slot, anchorId: e.target.value })}
          >
            {phantom.attachments.map((a) => (
              <option key={a.id} value={a.id}>
                {t(`preAssembly.panels.attachmentRole.${a.role}`)} ({a.id})
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="element-offset">
            {t('preAssembly.panels.element.placementOffset')}
          </label>
          <input
            id="element-offset"
            className={styles.fieldInput}
            type="text"
            value={formatOffsetTriple(slot.placementOffsetMm)}
            onChange={(e) => {
              const parsed = parseOffsetTriple(e.target.value)
              updateSlot({ ...slot, placementOffsetMm: parsed })
            }}
            placeholder="0, 0, 0"
          />
        </div>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={Boolean(slot.replaceable)}
            onChange={(e) => {
              const replaceable = e.target.checked
              updateSlot({
                ...slot,
                replaceable: replaceable || undefined,
                variants: replaceable
                  ? slot.variants ?? [{ id: 'v1', ref: slot.ref, label: slot.ref }]
                  : undefined,
                activeVariantId: replaceable ? (slot.activeVariantId ?? 'v1') : undefined,
              })
            }}
          />
          {t('preAssembly.panels.element.replaceable')}
        </label>
        {slot.replaceable && slot.variants && (
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="element-variant">
              {t('preAssembly.panels.element.activeVariant')}
            </label>
            <select
              id="element-variant"
              className={styles.fieldSelect}
              value={slot.activeVariantId ?? slot.variants[0]?.id ?? ''}
              onChange={(e) => updateSlot({ ...slot, activeVariantId: e.target.value })}
            >
              {slot.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label ?? v.ref}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={() => {
              const result = removeElementSlot(phantom, slot.id)
              if (result.ok) {
                applyPhantom(result.phantom)
                onSelectionChange(null)
              }
            }}
          >
            {t('preAssembly.panels.actions.remove')}
          </button>
        </div>
        {formError && (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        )}
      </div>
    )
  }

  const connection = phantom.connections.find((c) => c.id === selection.id)
  if (!connection) {
    return (
      <p className={styles.placeholder}>{t('preAssembly.panels.editor.notFound')}</p>
    )
  }

  const updateConn = (next: ElementConnection) => {
    const result = updateConnection(phantom, connection.id, next)
    if (result.ok) applyPhantom(result.phantom)
  }

  const renderEndpointFields = (
    label: string,
    endpointKey: 'endpointA' | 'endpointB',
    endpoint: ConnectionEndpoint,
  ) => (
    <>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>{label}</label>
        <select
          className={styles.fieldSelect}
          value={endpoint.kind}
          onChange={(e) => {
            const kind = e.target.value as 'element' | 'anchor'
            const nextEndpoint: ConnectionEndpoint =
              kind === 'anchor'
                ? {
                    kind: 'anchor',
                    anchorId: phantom.attachments[0]?.id ?? 'anchor',
                  }
                : {
                    kind: 'element',
                    elementId: phantom.elements[0]?.id ?? 'element',
                  }
            updateConn({ ...connection, [endpointKey]: nextEndpoint })
          }}
        >
          <option value="element">{t('preAssembly.panels.connection.endpointKindElement')}</option>
          <option value="anchor">{t('preAssembly.panels.connection.endpointKindAnchor')}</option>
        </select>
      </div>
      {endpoint.kind === 'element' ? (
        <div className={styles.field}>
          <select
            className={styles.fieldSelect}
            value={endpoint.elementId}
            onChange={(e) =>
              updateConn({
                ...connection,
                [endpointKey]: { kind: 'element', elementId: e.target.value },
              })
            }
          >
            {phantom.elements.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.name?.trim() || slot.ref}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className={styles.field}>
          <select
            className={styles.fieldSelect}
            value={endpoint.anchorId}
            onChange={(e) =>
              updateConn({
                ...connection,
                [endpointKey]: { kind: 'anchor', anchorId: e.target.value },
              })
            }
          >
            {phantom.attachments.map((a) => (
              <option key={a.id} value={a.id}>
                {t(`preAssembly.panels.attachmentRole.${a.role}`)}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  )

  return (
    <div className={styles.section}>
      <h3 className={styles.editorTitle}>{t('preAssembly.panels.connection.editorTitle')}</h3>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>{t('preAssembly.panels.common.id')}</label>
        <input className={styles.fieldInput} type="text" value={connection.id} readOnly />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="connection-binding">
          {t('preAssembly.panels.connection.bindingKindLabel')}
        </label>
        <select
          id="connection-binding"
          className={styles.fieldSelect}
          value={connection.bindingKind}
          onChange={(e) => {
            const bindingKind = e.target.value as ElementConnection['bindingKind']
            const rule =
              bindingKind === 'floating'
                ? {
                    kind: 'floating' as const,
                    minOffsetMm: 0,
                    maxOffsetMm: 10,
                    axis: 'x' as const,
                  }
                : { kind: 'coincident' as const }
            updateConn({ ...connection, bindingKind, rule })
          }}
        >
          <option value="rigid">{t('preAssembly.panels.connection.bindingKind.rigid')}</option>
          <option value="floating">
            {t('preAssembly.panels.connection.bindingKind.floating')}
          </option>
        </select>
      </div>
      {renderEndpointFields(
        t('preAssembly.panels.connection.endpointA'),
        'endpointA',
        connection.endpointA,
      )}
      {renderEndpointFields(
        t('preAssembly.panels.connection.endpointB'),
        'endpointB',
        connection.endpointB,
      )}
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="connection-rule">
          {t('preAssembly.panels.connection.ruleKind')}
        </label>
        <select
          id="connection-rule"
          className={styles.fieldSelect}
          value={connection.rule.kind}
          onChange={(e) => {
            const kind = e.target.value
            if (kind === 'coincident') {
              updateConn({ ...connection, rule: { kind: 'coincident' }, bindingKind: 'rigid' })
            } else if (kind === 'offset') {
              updateConn({ ...connection, rule: { kind: 'offset', offsetMm: 0 } })
            } else if (kind === 'floating') {
              updateConn({
                ...connection,
                bindingKind: 'floating',
                rule: { kind: 'floating', minOffsetMm: 0, maxOffsetMm: 10, axis: 'x' },
              })
            }
          }}
        >
          <option value="coincident">{t('preAssembly.panels.connection.rule.coincident')}</option>
          <option value="offset">{t('preAssembly.panels.connection.rule.offsetLabel')}</option>
          <option value="floating">{t('preAssembly.panels.connection.rule.floatingLabel')}</option>
        </select>
      </div>
      {connection.rule.kind === 'offset' && (
        <DimensionSpecField
          id="connection-offset"
          label={t('preAssembly.panels.connection.offsetMm')}
          value={connection.rule.offsetMm}
          parameters={phantom.parameters}
          onChange={(offsetMm) => {
            if (connection.rule.kind !== 'offset') return
            updateConn({ ...connection, rule: { kind: 'offset', offsetMm } })
          }}
        />
      )}
      {connection.rule.kind === 'floating' && (
        <>
          <DimensionSpecField
            id="connection-min"
            label={t('preAssembly.panels.connection.minOffset')}
            value={connection.rule.minOffsetMm}
            parameters={phantom.parameters}
            onChange={(minOffsetMm) => {
              if (connection.rule.kind !== 'floating') return
              updateConn({
                ...connection,
                rule: { ...connection.rule, minOffsetMm },
              })
            }}
          />
          <DimensionSpecField
            id="connection-max"
            label={t('preAssembly.panels.connection.maxOffset')}
            value={connection.rule.maxOffsetMm}
            parameters={phantom.parameters}
            onChange={(maxOffsetMm) => {
              if (connection.rule.kind !== 'floating') return
              updateConn({
                ...connection,
                rule: { ...connection.rule, maxOffsetMm },
              })
            }}
          />
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="connection-axis">
              {t('preAssembly.panels.connection.axis')}
            </label>
            <select
              id="connection-axis"
              className={styles.fieldSelect}
              value={connection.rule.axis}
              onChange={(e) => {
                if (connection.rule.kind !== 'floating') return
                updateConn({
                  ...connection,
                  rule: {
                    ...connection.rule,
                    axis: e.target.value as 'x' | 'y' | 'z',
                  },
                })
              }}
            >
              <option value="x">X</option>
              <option value="y">Y</option>
              <option value="z">Z</option>
            </select>
          </div>
        </>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.dangerBtn}
          onClick={() => {
            const result = removeConnection(phantom, connection.id)
            if (result.ok) {
              applyPhantom(result.phantom)
              onSelectionChange(null)
            }
          }}
        >
          {t('preAssembly.panels.actions.remove')}
        </button>
      </div>
    </div>
  )
}

export function usePreAssemblyPanelActions(
  phantomDoc: PhantomAssemblyFile | null,
  onPhantomDocChange: (next: PhantomAssemblyFile) => void,
  onSelectionChange: (next: PreAssemblyPanelSelection) => void,
) {
  const handleAddParameter = useCallback(() => {
    if (!phantomDoc) return
    const result = addParameter(phantomDoc.phantom, {
      kind: 'literal',
      valueMm: 0,
    })
    if (!result.ok) return
    const next = updatePhantomInFile(phantomDoc, result.phantom)
    onPhantomDocChange(next)
    const created = result.phantom.parameters[result.phantom.parameters.length - 1]
    if (created) onSelectionChange({ kind: 'parameter', id: created.id })
  }, [onPhantomDocChange, onSelectionChange, phantomDoc])

  const handleAddConnection = useCallback(() => {
    if (!phantomDoc) return
    const phantom = phantomDoc.phantom
    const endpointA: ConnectionEndpoint =
      phantom.elements[0]
        ? { kind: 'element', elementId: phantom.elements[0].id }
        : phantom.attachments[0]
          ? { kind: 'anchor', anchorId: phantom.attachments[0].id }
          : { kind: 'anchor', anchorId: 'missing' }
    const endpointB: ConnectionEndpoint =
      phantom.elements[1]
        ? { kind: 'element', elementId: phantom.elements[1].id }
        : phantom.attachments[1]
          ? { kind: 'anchor', anchorId: phantom.attachments[1].id }
          : endpointA
    const result = addConnection(phantom, { endpointA, endpointB })
    if (!result.ok) return
    const next = updatePhantomInFile(phantomDoc, result.phantom)
    onPhantomDocChange(next)
    const created = result.phantom.connections[result.phantom.connections.length - 1]
    if (created) onSelectionChange({ kind: 'connection', id: created.id })
  }, [onPhantomDocChange, onSelectionChange, phantomDoc])

  return { handleAddParameter, handleAddConnection }
}
