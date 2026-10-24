import type { BufferGeometry } from 'three'
import type { AssemblyMate } from '../assembly-mates/model'
import { cleanSizeMmFloat, resolveSizeStepMm, sizeMmForUi } from '../app-settings'
import type { FaceConstraint } from '../face-constraints/model'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import type { PreparedModelElement } from '../../lib/preparedElementFormat'
import { buildCustomSizeTreeNodes } from './buildCustomSizeTreeNodes'
import type { DocumentTreeAxis, DocumentTreeNode } from './model'
import { isPartLocked, type PartLockMap } from './partLock'
import {
  resolveCanonicalSizeNodeBinding,
  type SizeNodeBinding,
} from './resolveSizeNodeBinding'

export type SizeMm = { x: number; y: number; z: number }

export type BuildDocumentTreeInput = {
  /** Tryb detalu: nazwa pliku / modelu. */
  partRootLabel: string
  partSizeMm: SizeMm | null
  hasPartModel: boolean
  mainGeometry?: BufferGeometry | null
  mainFaceConstraints?: readonly FaceConstraint[]
  mainModelElements?: readonly PreparedModelElement[]
  /** Tryb montażu. */
  assemblyName: string
  programParts: readonly PreAssemblyProgramPart[]
  partDisplayNameById: Readonly<Record<string, string>>
  partSizeMmById: Readonly<Record<string, SizeMm | undefined>>
  modelElementsByPartId: Readonly<Record<string, readonly PreparedModelElement[] | undefined>>
  partGeometryById?: Readonly<Record<string, BufferGeometry | undefined>>
  faceConstraintsByPartId?: Readonly<Record<string, readonly FaceConstraint[] | undefined>>
  mates: readonly AssemblyMate[]
  partLocks: PartLockMap
}

function formatSizeMm(value: number): string {
  if (!Number.isFinite(value)) return '—'
  // 2 miejsca — bez szumu float w etykiecie
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

/**
 * Editable → siatka kroku UI; lockedByCustom / inne zablokowane → tylko clean float
 * (Y/Z zależne od custom nie mogą być „zaokrąglane” do 1 / 0.5).
 */
function sizeMmForCanonicalNode(
  raw: number | null | undefined,
  binding: SizeNodeBinding,
): number | undefined {
  if (raw == null || !Number.isFinite(raw)) return undefined
  if (
    !binding.editable ||
    binding.status === 'lockedByCustom' ||
    binding.lockReason === 'customConflict'
  ) {
    return cleanSizeMmFloat(raw)
  }
  return sizeMmForUi(raw, resolveSizeStepMm)
}

function sizeChildren(params: {
  prefix: string
  size: SizeMm | null
  partId?: string
  geometry: BufferGeometry | null
  modelElements: readonly PreparedModelElement[]
  constraints: readonly FaceConstraint[]
}): DocumentTreeNode[] {
  const { prefix, size, partId, geometry, modelElements, constraints } = params
  const axes: DocumentTreeAxis[] = ['x', 'y', 'z']
  const canonical = axes.map((axis) => {
    const raw = size?.[axis]
    const binding = resolveCanonicalSizeNodeBinding({
      geometry,
      modelElements,
      constraints,
      axis,
      sizeMm: raw,
    })
    const value = sizeMmForCanonicalNode(raw, binding)
    const axisLabel = axis.toUpperCase()
    const name = binding.displayName?.trim() || axisLabel
    const label =
      size != null && value != null ? `${name}: ${formatSizeMm(value)} mm` : name
    return {
      id: `${prefix}:size:${axis}`,
      kind: 'size' as const,
      label,
      axis,
      sizeMm: value,
      partId,
      constraintId: binding.constraintId ?? undefined,
      displayName: binding.displayName ?? undefined,
      editable: binding.editable,
      sizeStatus: binding.status,
      sizeLockReason: binding.lockReason,
      faceIndices: binding.faceIndices,
      // Limity custom NIE są limitami osi Y/Z — nie kopiuj na węzeł zależny
      limitMinMm:
        binding.status === 'lockedByCustom' ? undefined : binding.limitMinMm ?? undefined,
      limitMaxMm:
        binding.status === 'lockedByCustom' ? undefined : binding.limitMaxMm ?? undefined,
    }
  })

  const custom = buildCustomSizeTreeNodes({
    prefix,
    partId,
    geometry,
    modelElements,
    constraints,
  })

  // Jedna zwijana grupa „Sizes” (X/Y/Z + własne)
  return [
    {
      id: `${prefix}:sizes`,
      kind: 'sizesGroup',
      label: 'Sizes',
      partId,
      children: [...canonical, ...custom],
    },
  ]
}

/** Id detali biorących udział w przywiązaniu (A i B — bez duplikatów). */
export function mateParticipantPartIds(mate: AssemblyMate): string[] {
  const ids = [mate.entityA.partId, mate.entityB.partId]
  return [...new Set(ids.filter((id) => id.trim().length > 0))]
}

function mateLabel(mate: AssemblyMate, index: number): string {
  const offset =
    Number.isFinite(mate.offsetMm) && mate.offsetMm !== 0
      ? ` · ${formatSizeMm(mate.offsetMm)} mm`
      : ''
  return `Parallel ${index + 1}${offset}`
}

function mateNodesForPart(
  partId: string,
  mates: readonly AssemblyMate[],
  mateIndexById: ReadonlyMap<string, number>,
): DocumentTreeNode[] {
  const prefix = `part:${partId}`
  const forPart = mates.filter((mate) => mateParticipantPartIds(mate).includes(partId))
  if (forPart.length === 0) return []

  const mateNodes: DocumentTreeNode[] = forPart.map((mate) => {
    const index = mateIndexById.get(mate.id) ?? 0
    const suppressed = mate.suppressed === true
    return {
      id: `${prefix}:mate:${mate.id}`,
      kind: 'mate' as const,
      label: mateLabel(mate, index),
      partId,
      mateId: mate.id,
      suppressed,
    }
  })

  return [
    {
      id: `${prefix}:mates`,
      kind: 'matesGroup',
      label: 'Mates',
      partId,
      children: mateNodes,
    },
  ]
}

function partSubtree(
  part: PreAssemblyProgramPart,
  displayName: string,
  size: SizeMm | undefined,
  elements: readonly PreparedModelElement[] | undefined,
  locked: boolean,
  mates: readonly AssemblyMate[],
  mateIndexById: ReadonlyMap<string, number>,
  geometry: BufferGeometry | null,
  constraints: readonly FaceConstraint[],
): DocumentTreeNode {
  const prefix = `part:${part.id}`
  const modelElements = elements ?? []
  const elementNodes: DocumentTreeNode[] = modelElements.map((el) => ({
    id: `${prefix}:element:${el.id}`,
    kind: 'element',
    label: el.id,
    partId: part.id,
    elementId: el.id,
  }))

  const children: DocumentTreeNode[] = [
    {
      id: `${prefix}:model`,
      kind: 'model',
      label: 'Model',
      partId: part.id,
    },
    {
      id: `${prefix}:appearance`,
      kind: 'appearance',
      label: 'Appearance',
      partId: part.id,
    },
    ...sizeChildren({
      prefix,
      size: size ?? null,
      partId: part.id,
      geometry,
      modelElements,
      constraints,
    }),
  ]

  if (elementNodes.length > 0) {
    children.push({
      id: `${prefix}:elements`,
      kind: 'elementsGroup',
      label: 'Elements',
      partId: part.id,
      children: elementNodes,
    })
  }

  children.push(...mateNodesForPart(part.id, mates, mateIndexById))

  return {
    id: prefix,
    kind: 'part',
    label: displayName,
    partId: part.id,
    locked,
    children,
  }
}

/**
 * Buduje drzewo dokumentu: montaż (gdy są programParts) albo pojedynczy detal.
 * Etykiety „Model” / „Appearance” / „Elements” są stałe EN w modelu;
 * UI może je nadpisać przez i18n po kind.
 */
export function buildDocumentTree(input: BuildDocumentTreeInput): DocumentTreeNode | null {
  const {
    partRootLabel,
    partSizeMm,
    hasPartModel,
    mainGeometry = null,
    mainFaceConstraints = [],
    mainModelElements = [],
    assemblyName,
    programParts,
    partDisplayNameById,
    partSizeMmById,
    modelElementsByPartId,
    partGeometryById = {},
    faceConstraintsByPartId = {},
    mates,
    partLocks,
  } = input

  if (programParts.length > 0) {
    const mateIndexById = new Map(mates.map((mate, index) => [mate.id, index]))
    const partNodes = programParts.map((part) =>
      partSubtree(
        part,
        partDisplayNameById[part.id] ?? part.name,
        partSizeMmById[part.id],
        modelElementsByPartId[part.id],
        isPartLocked(partLocks, part.id),
        mates,
        mateIndexById,
        partGeometryById[part.id] ?? null,
        faceConstraintsByPartId[part.id] ?? [],
      ),
    )

    return {
      id: 'root:assembly',
      kind: 'root',
      label: assemblyName || 'Assembly',
      children: partNodes,
    }
  }

  if (!hasPartModel) {
    return null
  }

  return {
    id: 'root:part',
    kind: 'root',
    label: partRootLabel || 'Part',
    children: [
      {
        id: 'part:main:model',
        kind: 'model',
        label: 'Model',
      },
      {
        id: 'part:main:appearance',
        kind: 'appearance',
        label: 'Appearance',
      },
      ...sizeChildren({
        prefix: 'part:main',
        size: partSizeMm,
        geometry: mainGeometry,
        modelElements: mainModelElements,
        constraints: mainFaceConstraints,
      }),
    ],
  }
}

/** Znajdź węzeł po id (DFS). */
export function findDocumentTreeNode(
  root: DocumentTreeNode | null,
  nodeId: string,
): DocumentTreeNode | null {
  if (!root) return null
  if (root.id === nodeId) return root
  for (const child of root.children ?? []) {
    const found = findDocumentTreeNode(child, nodeId)
    if (found) return found
  }
  return null
}

/** Zbierz wszystkie id węzłów z dziećmi (do expand/collapse all). */
export function collectExpandableNodeIds(root: DocumentTreeNode | null): string[] {
  if (!root) return []
  const ids: string[] = []
  const walk = (node: DocumentTreeNode) => {
    if (node.children && node.children.length > 0) {
      ids.push(node.id)
      for (const child of node.children) walk(child)
    }
  }
  walk(root)
  return ids
}
