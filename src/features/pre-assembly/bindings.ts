import type {
  DimensionSpec,
  ElementDrivenProperty,
  ElementPropertyValues,
  PhantomAssembly,
  ResolvePhantomParametersResult,
  ValidateBindingsResult,
} from './model'

const ELEMENT_DRIVEN_PROPERTIES: ReadonlySet<ElementDrivenProperty> = new Set([
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
])

function paramIdSet(phantom: PhantomAssembly): Set<string> {
  return new Set(phantom.parameters.map((p) => p.id))
}

function anchorIdSet(phantom: PhantomAssembly): Set<string> {
  return new Set(phantom.attachments.map((a) => a.id))
}

function elementIdSet(phantom: PhantomAssembly): Set<string> {
  return new Set(phantom.elements.map((e) => e.id))
}

export function isDimensionSpecResolvable(
  spec: DimensionSpec,
  paramIds: ReadonlySet<string>,
): boolean {
  if (typeof spec === 'number') return Number.isFinite(spec)
  return paramIds.has(spec.paramId)
}

export function resolveDimensionSpec(
  spec: DimensionSpec,
  values: Readonly<Record<string, number>>,
): number | null {
  if (typeof spec === 'number') {
    return Number.isFinite(spec) ? spec : null
  }
  const value = values[spec.paramId]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function collectDimensionSpecsFromPhantom(phantom: PhantomAssembly): DimensionSpec[] {
  const specs: DimensionSpec[] = [
    phantom.envelope.widthMm,
    phantom.envelope.heightMm,
    phantom.envelope.depthMm,
  ]
  for (const attachment of phantom.attachments) {
    if (attachment.source.kind === 'offsetPlane') {
      specs.push(attachment.source.offsetMm)
    }
  }
  for (const connection of phantom.connections) {
    const rule = connection.rule
    if (rule.kind === 'offset') specs.push(rule.offsetMm)
    if (rule.kind === 'floating') {
      specs.push(rule.minOffsetMm, rule.maxOffsetMm)
    }
  }
  return specs
}

function endpointResolvable(
  endpoint: PhantomAssembly['connections'][number]['endpointA'],
  anchors: ReadonlySet<string>,
  elements: ReadonlySet<string>,
): boolean {
  if (endpoint.kind === 'anchor') return anchors.has(endpoint.anchorId)
  return elements.has(endpoint.elementId)
}

function connectionRuleComplete(
  bindingKind: PhantomAssembly['connections'][number]['bindingKind'],
  rule: PhantomAssembly['connections'][number]['rule'],
  paramIds: ReadonlySet<string>,
): boolean {
  switch (rule.kind) {
    case 'coincident':
      return bindingKind === 'rigid'
    case 'offset':
      return isDimensionSpecResolvable(rule.offsetMm, paramIds)
    case 'floating':
      if (bindingKind !== 'floating') return false
      return (
        isDimensionSpecResolvable(rule.minOffsetMm, paramIds) &&
        isDimensionSpecResolvable(rule.maxOffsetMm, paramIds)
      )
    case 'custom':
      return rule.expression.trim().length > 0
    default:
      return false
  }
}

/** Weryfikuje kompletność grafu powiązań przed zapisem / podmianą wariantu. */
export function validateBindingsComplete(phantom: PhantomAssembly): ValidateBindingsResult {
  const paramIds = paramIdSet(phantom)
  const anchors = anchorIdSet(phantom)
  const elements = elementIdSet(phantom)

  for (const param of phantom.parameters) {
    if (param.kind === 'fromElement' && !elements.has(param.elementId)) {
      return {
        ok: false,
        error: `Parameter "${param.id}" references unknown element "${param.elementId}".`,
      }
    }
    if (param.kind === 'expr') {
      return {
        ok: false,
        error: `Parameter "${param.id}" uses unsupported expr kind.`,
      }
    }
  }

  for (const spec of collectDimensionSpecsFromPhantom(phantom)) {
    if (typeof spec !== 'number' && !paramIds.has(spec.paramId)) {
      return {
        ok: false,
        error: `DimensionSpec references unknown parameter "${spec.paramId}".`,
      }
    }
  }

  for (const slot of phantom.elements) {
    if (!anchors.has(slot.anchorId)) {
      return {
        ok: false,
        error: `Element slot "${slot.id}" references unknown anchor "${slot.anchorId}".`,
      }
    }
    if (typeof slot.ref !== 'string' || slot.ref.trim().length === 0) {
      return { ok: false, error: `Element slot "${slot.id}" requires a ref.` }
    }
    if (slot.replaceable) {
      if (!slot.variants || slot.variants.length === 0) {
        return {
          ok: false,
          error: `Replaceable slot "${slot.id}" requires non-empty variants.`,
        }
      }
      const variantIds = new Set(slot.variants.map((v) => v.id))
      if (slot.activeVariantId !== undefined && !variantIds.has(slot.activeVariantId)) {
        return {
          ok: false,
          error: `Slot "${slot.id}" activeVariantId is not in variants.`,
        }
      }
    }
  }

  for (const connection of phantom.connections) {
    if (
      !endpointResolvable(connection.endpointA, anchors, elements) ||
      !endpointResolvable(connection.endpointB, anchors, elements)
    ) {
      return {
        ok: false,
        error: `Connection "${connection.id}" has an unresolved endpoint.`,
      }
    }
    if (!connectionRuleComplete(connection.bindingKind, connection.rule, paramIds)) {
      return {
        ok: false,
        error: `Connection "${connection.id}" has an incomplete rule.`,
      }
    }
    if (connection.bindingKind === 'floating' && connection.rule.kind !== 'floating') {
      return {
        ok: false,
        error: `Floating connection "${connection.id}" requires a floating rule with min, max, and axis.`,
      }
    }
  }

  return { ok: true }
}

function readElementProperty(
  elementProperties: Readonly<Record<string, ElementPropertyValues>>,
  elementId: string,
  property: ElementDrivenProperty,
): number | null {
  const props = elementProperties[elementId]
  if (!props) return null
  const value = props[property]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Rozwiązuje parametry literal i fromElement (expr — faza 2). */
export function resolvePhantomParameters(
  phantom: PhantomAssembly,
  elementProperties: Readonly<Record<string, ElementPropertyValues>> = {},
): ResolvePhantomParametersResult {
  const values: Record<string, number> = {}

  for (const param of phantom.parameters) {
    if (param.kind === 'literal') {
      if (!Number.isFinite(param.valueMm)) {
        return { ok: false, error: `Parameter "${param.id}" has invalid literal value.` }
      }
      values[param.id] = param.valueMm
      continue
    }
    if (param.kind === 'fromElement') {
      const value = readElementProperty(elementProperties, param.elementId, param.property)
      if (value === null) {
        return {
          ok: false,
          error: `Parameter "${param.id}" cannot resolve fromElement "${param.elementId}.${param.property}".`,
        }
      }
      values[param.id] = value
      continue
    }
    return { ok: false, error: `Parameter "${param.id}" uses unsupported expr kind.` }
  }

  return { ok: true, values }
}

export { ELEMENT_DRIVEN_PROPERTIES }
