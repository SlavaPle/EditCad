import {
  ELEMENT_COMPOSITION_FORMAT,
  ELEMENT_COMPOSITION_VERSION,
  type CompositionAxis,
  type ElementCompositionFile,
  type ElementCompositionNode,
  type ElementPlacement,
  type ElementSelector,
  type MassSpec,
  type ParseElementCompositionResult,
} from './model'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPlainJsonValue(value: unknown): boolean {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true
  }
  if (Array.isArray(value)) {
    return value.every(isPlainJsonValue)
  }
  if (isObject(value)) {
    return Object.values(value).every(isPlainJsonValue)
  }
  return false
}

function parseDetails(value: unknown): Record<string, unknown> | undefined | null {
  if (value === undefined) return undefined
  if (!isObject(value)) return null
  if (!isPlainJsonValue(value)) return null
  return value
}

function parseFormulas(value: unknown): Record<string, string> | undefined | null {
  if (value === undefined) return undefined
  if (!isObject(value)) return null
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (typeof key !== 'string' || key.trim().length === 0) return null
    if (typeof raw !== 'string' || raw.trim().length === 0) return null
    out[key.trim()] = raw
  }
  return out
}

function parsePositiveFinite(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return value
}

function parseNonNegativeFinite(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  return value
}

function parseCompositionAxis(value: unknown): CompositionAxis | undefined {
  if (value === undefined) return undefined
  if (value === 'x' || value === 'y' || value === 'z') return value
  return null as unknown as CompositionAxis
}

function parseMassSpec(value: unknown): MassSpec | undefined | null {
  if (value === undefined) return undefined
  if (!isObject(value) || typeof value.kind !== 'string') return null
  switch (value.kind) {
    case 'fixed': {
      const kg = parsePositiveFinite(value.kg)
      if (kg === null) return null
      return { kind: 'fixed', kg }
    }
    case 'linear': {
      const kgPerM = parsePositiveFinite(value.kgPerM)
      if (kgPerM === null) return null
      const lengthRef =
        value.lengthRef === undefined
          ? undefined
          : typeof value.lengthRef === 'string' && value.lengthRef.trim().length > 0
            ? value.lengthRef.trim()
            : null
      if (lengthRef === null) return null
      return lengthRef === undefined
        ? { kind: 'linear', kgPerM }
        : { kind: 'linear', kgPerM, lengthRef }
    }
    case 'density': {
      const kgPerM3 = parsePositiveFinite(value.kgPerM3)
      if (kgPerM3 === null) return null
      const volumeRef =
        value.volumeRef === undefined
          ? undefined
          : typeof value.volumeRef === 'string' && value.volumeRef.trim().length > 0
            ? value.volumeRef.trim()
            : null
      if (volumeRef === null) return null
      return volumeRef === undefined
        ? { kind: 'density', kgPerM3 }
        : { kind: 'density', kgPerM3, volumeRef }
    }
    case 'sumChildren':
      return { kind: 'sumChildren' }
    case 'formula': {
      if (typeof value.expression !== 'string' || value.expression.trim().length === 0) {
        return null
      }
      return { kind: 'formula', expression: value.expression.trim() }
    }
    default:
      return null
  }
}

function parseElementSelector(value: unknown): ElementSelector | undefined | null {
  if (value === undefined) return undefined
  if (!isObject(value) || typeof value.kind !== 'string') return null
  switch (value.kind) {
    case 'always':
      return { kind: 'always' }
    case 'lengthMm': {
      const minMm =
        value.minMm === undefined ? undefined : parseNonNegativeFinite(value.minMm)
      const maxMm =
        value.maxMm === undefined ? undefined : parseNonNegativeFinite(value.maxMm)
      if (minMm === null || maxMm === null) return null
      if (minMm === undefined && maxMm === undefined) return null
      if (minMm !== undefined && maxMm !== undefined && minMm > maxMm) return null
      return {
        kind: 'lengthMm',
        ...(minMm !== undefined ? { minMm } : {}),
        ...(maxMm !== undefined ? { maxMm } : {}),
      }
    }
    case 'formula': {
      if (typeof value.when !== 'string' || value.when.trim().length === 0) return null
      return { kind: 'formula', when: value.when.trim() }
    }
    default:
      return null
  }
}

function parseElementPlacement(value: unknown): ElementPlacement | undefined | null {
  if (value === undefined) return undefined
  if (!isObject(value) || typeof value.kind !== 'string') return null
  switch (value.kind) {
    case 'included':
      return { kind: 'included' }
    case 'countPerParent': {
      const count = value.count
      if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0) return null
      return { kind: 'countPerParent', count }
    }
    case 'spacingAlongParent': {
      const spacingMm = parsePositiveFinite(value.spacingMm)
      if (spacingMm === null) return null
      const axis = parseCompositionAxis(value.axis)
      if (axis === (null as unknown as CompositionAxis)) return null
      return axis === undefined
        ? { kind: 'spacingAlongParent', spacingMm }
        : { kind: 'spacingAlongParent', spacingMm, axis }
    }
    case 'formula': {
      if (typeof value.expression !== 'string' || value.expression.trim().length === 0) {
        return null
      }
      return { kind: 'formula', expression: value.expression.trim() }
    }
    default:
      return null
  }
}

function collectNodeIds(nodes: readonly ElementCompositionNode[], into: Set<string>): boolean {
  for (const node of nodes) {
    if (into.has(node.id)) return false
    into.add(node.id)
    if (node.variants && !collectNodeIds(node.variants, into)) return false
    if (node.children && !collectNodeIds(node.children, into)) return false
  }
  return true
}

function parseElementCompositionNode(value: unknown): ElementCompositionNode | null {
  if (!isObject(value)) return null
  if (typeof value.id !== 'string' || value.id.trim().length === 0) return null
  const name =
    value.name === undefined
      ? undefined
      : typeof value.name === 'string' && value.name.trim().length > 0
        ? value.name.trim()
        : null
  if (name === null) return null
  const ref =
    value.ref === undefined
      ? undefined
      : typeof value.ref === 'string' && value.ref.trim().length > 0
        ? value.ref.trim()
        : null
  if (ref === null) return null

  const selector = parseElementSelector(value.selector)
  if (selector === null) return null
  const placement = parseElementPlacement(value.placement)
  if (placement === null) return null
  const mass = parseMassSpec(value.mass)
  if (mass === null) return null
  const totalMass = parseMassSpec(value.totalMass)
  if (totalMass === null) return null
  const details = parseDetails(value.details)
  if (details === null) return null
  const formulas = parseFormulas(value.formulas)
  if (formulas === null) return null

  let variants: ElementCompositionNode[] | undefined
  if (value.variants !== undefined) {
    if (!Array.isArray(value.variants)) return null
    variants = []
    for (const item of value.variants) {
      const node = parseElementCompositionNode(item)
      if (!node) return null
      variants.push(node)
    }
  }

  let children: ElementCompositionNode[] | undefined
  if (value.children !== undefined) {
    if (!Array.isArray(value.children)) return null
    children = []
    for (const item of value.children) {
      const node = parseElementCompositionNode(item)
      if (!node) return null
      children.push(node)
    }
  }

  const localIds = new Set<string>()
  if (variants && !collectNodeIds(variants, localIds)) return null
  if (children && !collectNodeIds(children, localIds)) return null

  return {
    id: value.id.trim(),
    ...(name !== undefined ? { name } : {}),
    ...(ref !== undefined ? { ref } : {}),
    ...(selector !== undefined ? { selector } : {}),
    ...(placement !== undefined ? { placement } : {}),
    ...(mass !== undefined ? { mass } : {}),
    ...(totalMass !== undefined ? { totalMass } : {}),
    ...(variants !== undefined ? { variants } : {}),
    ...(children !== undefined ? { children } : {}),
    ...(details !== undefined ? { details } : {}),
    ...(formulas !== undefined ? { formulas } : {}),
  }
}

function parseNodeList(value: unknown): ElementCompositionNode[] | null | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return null
  const nodes: ElementCompositionNode[] = []
  const ids = new Set<string>()
  for (const item of value) {
    const node = parseElementCompositionNode(item)
    if (!node) return null
    if (ids.has(node.id)) return null
    ids.add(node.id)
    nodes.push(node)
  }
  return nodes
}

export function validateElementCompositionFile(value: unknown): ParseElementCompositionResult {
  if (!isObject(value)) {
    return { ok: false, error: 'Element composition must be an object.' }
  }
  if (value.format !== ELEMENT_COMPOSITION_FORMAT) {
    return { ok: false, error: 'Invalid element composition format identifier.' }
  }
  if (value.version !== ELEMENT_COMPOSITION_VERSION) {
    return { ok: false, error: 'Unsupported element composition version.' }
  }
  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    return { ok: false, error: 'Element composition id is required.' }
  }
  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    return { ok: false, error: 'Element composition name is required.' }
  }

  const selector = parseElementSelector(value.selector)
  if (selector === null) {
    return { ok: false, error: 'Invalid selector in element composition file.' }
  }
  const placement = parseElementPlacement(value.placement)
  if (placement === null) {
    return { ok: false, error: 'Invalid placement in element composition file.' }
  }
  const mass = parseMassSpec(value.mass)
  if (mass === null) {
    return { ok: false, error: 'Invalid mass in element composition file.' }
  }
  const totalMass = parseMassSpec(value.totalMass)
  if (totalMass === null) {
    return { ok: false, error: 'Invalid totalMass in element composition file.' }
  }
  const details = parseDetails(value.details)
  if (details === null) {
    return { ok: false, error: 'Invalid details in element composition file.' }
  }
  const formulas = parseFormulas(value.formulas)
  if (formulas === null) {
    return { ok: false, error: 'Invalid formulas in element composition file.' }
  }

  const variants = parseNodeList(value.variants)
  if (variants === null) {
    return { ok: false, error: 'Invalid variants in element composition file.' }
  }
  const children = parseNodeList(value.children)
  if (children === null) {
    return { ok: false, error: 'Invalid children in element composition file.' }
  }

  return {
    ok: true,
    file: {
      format: ELEMENT_COMPOSITION_FORMAT,
      version: ELEMENT_COMPOSITION_VERSION,
      id: value.id.trim(),
      name: value.name.trim(),
      ...(selector !== undefined ? { selector } : {}),
      ...(placement !== undefined ? { placement } : {}),
      ...(mass !== undefined ? { mass } : {}),
      ...(totalMass !== undefined ? { totalMass } : {}),
      ...(variants !== undefined ? { variants } : {}),
      ...(children !== undefined ? { children } : {}),
      ...(details !== undefined ? { details } : {}),
      ...(formulas !== undefined ? { formulas } : {}),
    },
  }
}

export function serializeElementCompositionFile(file: ElementCompositionFile): string {
  return JSON.stringify(file, null, 2)
}

export function parseElementCompositionFile(content: string): ParseElementCompositionResult {
  try {
    const json = JSON.parse(content) as unknown
    return validateElementCompositionFile(json)
  } catch {
    return { ok: false, error: 'Element composition file is not valid JSON.' }
  }
}
