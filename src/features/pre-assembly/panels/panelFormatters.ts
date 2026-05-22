import type { TFunction } from 'i18next'
import type {
  AttachmentAnchor,
  DimensionSpec,
  ElementConnection,
  PhantomAssembly,
  PhantomElementSlot,
  PhantomEnvelope,
  PhantomParameter,
} from '../model'
import { resolvePhantomParameters } from '../bindings'
import { resolveEnvelopeSizeMm } from '../phantomGeometry'

export function formatDimensionSpec(
  spec: DimensionSpec,
  t: TFunction,
  paramValues?: Readonly<Record<string, number>>,
): string {
  if (typeof spec === 'number') {
    return t('preAssembly.panels.dimension.literal', { value: spec })
  }
  const resolved = paramValues?.[spec.paramId]
  if (typeof resolved === 'number' && Number.isFinite(resolved)) {
    return t('preAssembly.panels.dimension.paramResolved', {
      paramId: spec.paramId,
      value: Number(resolved.toFixed(2)),
    })
  }
  return t('preAssembly.panels.dimension.param', { paramId: spec.paramId })
}

export function formatParameterSource(param: PhantomParameter, t: TFunction): string {
  if (param.kind === 'literal') {
    return t('preAssembly.panels.parameter.sourceLiteral', { value: param.valueMm })
  }
  if (param.kind === 'fromElement') {
    return t('preAssembly.panels.parameter.sourceFromElement', {
      elementId: param.elementId,
      property: param.property,
    })
  }
  return t('preAssembly.panels.parameter.sourceExpr', { expression: param.expression })
}

export function formatEnvelopeSummary(
  envelope: PhantomEnvelope,
  t: TFunction,
  paramValues?: Readonly<Record<string, number>>,
): string {
  const w = formatDimensionSpec(envelope.widthMm, t, paramValues)
  const h = formatDimensionSpec(envelope.heightMm, t, paramValues)
  const d = formatDimensionSpec(envelope.depthMm, t, paramValues)
  return t('preAssembly.panels.envelope.summary', {
    kind: t(`preAssembly.panels.envelope.phantomKind.${envelope.phantomKind}`),
    width: w,
    height: h,
    depth: d,
  })
}

export function resolvePhantomParamValuesForDisplay(
  phantom: PhantomAssembly,
): Record<string, number> | null {
  const result = resolvePhantomParameters(phantom)
  return result.ok ? result.values : null
}

export function formatResolvedEnvelopeAxes(
  phantom: PhantomAssembly,
  t: TFunction,
): string | null {
  const paramValues = resolvePhantomParamValuesForDisplay(phantom)
  if (!paramValues) return null
  const size = resolveEnvelopeSizeMm(phantom.envelope, paramValues)
  if (!size) return null
  return t('preAssembly.panels.envelope.resolvedAxes', {
    x: Number(size.x.toFixed(2)),
    y: Number(size.y.toFixed(2)),
    z: Number(size.z.toFixed(2)),
  })
}

export function formatAttachmentSource(attachment: AttachmentAnchor, t: TFunction): string {
  if (attachment.source.kind === 'boxFace') {
    return t('preAssembly.panels.attachment.sourceBoxFace', {
      face: t(`preAssembly.panels.boxFace.${attachment.source.face}`),
    })
  }
  return t('preAssembly.panels.attachment.sourceOffsetPlane', {
    face: t(`preAssembly.panels.boxFace.${attachment.source.face}`),
    offset: formatDimensionSpec(attachment.source.offsetMm, t),
  })
}

export function formatElementLabel(
  slot: PhantomElementSlot,
  t: TFunction,
  anchorRole?: string,
): string {
  const refLabel = slot.name?.trim() || slot.ref
  const anchorSuffix = anchorRole
    ? t('preAssembly.panels.element.anchorSuffix', { role: anchorRole })
    : ''
  if (slot.replaceable && slot.variants && slot.variants.length > 0) {
    const active =
      slot.activeVariantId !== undefined
        ? slot.variants.find((v) => v.id === slot.activeVariantId)
        : null
    const variantLabel = active?.label ?? active?.ref ?? slot.ref
    return t('preAssembly.panels.element.replaceableLabel', {
      name: refLabel,
      variant: variantLabel,
      anchor: anchorSuffix,
    })
  }
  return t('preAssembly.panels.element.fixedLabel', { name: refLabel, anchor: anchorSuffix })
}

function formatEndpoint(
  endpoint: ElementConnection['endpointA'],
  phantom: PhantomAssembly,
  t: TFunction,
): string {
  if (endpoint.kind === 'anchor') {
    const anchor = phantom.attachments.find((a) => a.id === endpoint.anchorId)
    const role = anchor ? t(`preAssembly.panels.attachmentRole.${anchor.role}`) : endpoint.anchorId
    return t('preAssembly.panels.connection.endpointAnchor', { role })
  }
  const slot = phantom.elements.find((e) => e.id === endpoint.elementId)
  const name = slot?.name ?? slot?.ref ?? endpoint.elementId
  return t('preAssembly.panels.connection.endpointElement', { name })
}

export function formatConnectionSummary(
  connection: ElementConnection,
  phantom: PhantomAssembly,
  t: TFunction,
  paramValues?: Readonly<Record<string, number>>,
): string {
  const a = formatEndpoint(connection.endpointA, phantom, t)
  const b = formatEndpoint(connection.endpointB, phantom, t)
  const binding = t(`preAssembly.panels.connection.bindingKind.${connection.bindingKind}`)
  let rule = ''
  switch (connection.rule.kind) {
    case 'coincident':
      rule = t('preAssembly.panels.connection.rule.coincident')
      break
    case 'offset':
      rule = t('preAssembly.panels.connection.rule.offset', {
        offset: formatDimensionSpec(connection.rule.offsetMm, t, paramValues),
      })
      break
    case 'floating':
      rule = t('preAssembly.panels.connection.rule.floating', {
        min: formatDimensionSpec(connection.rule.minOffsetMm, t, paramValues),
        max: formatDimensionSpec(connection.rule.maxOffsetMm, t, paramValues),
        axis: connection.rule.axis.toUpperCase(),
      })
      break
    case 'custom':
      rule = t('preAssembly.panels.connection.rule.custom', {
        expression: connection.rule.expression,
      })
      break
  }
  return t('preAssembly.panels.connection.summary', { a, b, binding, rule })
}
