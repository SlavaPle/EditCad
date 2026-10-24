import { useMemo, useState, useCallback, useEffect } from 'react'
import type { BufferGeometry } from 'three'
import { useTranslation } from 'react-i18next'
import type { AssemblyMate } from '../assembly-mates/model'
import type { MateEntityHighlights } from '../assembly-mates/matePlaneFaceOverlay'
import type { FaceConstraint } from '../face-constraints/model'
import type { SizeEditApplyPayload } from './sizeEditApplyPayload'
import type { PreAssemblyProgramPart } from '../pre-assembly/preAssemblyProgram'
import { cleanSizeMmFloat, resolveSizeStepMm, sizeMmForUi } from '../app-settings'
import { geometryExtentMm } from '../pre-assembly/viewer/layoutProgramPartPositionsMm'
import { buildProgramPartDisplayNameById } from '../pre-assembly/programParts/programPartDisplayName'
import type { PreparedElementConstraints } from '../../lib/preparedElementFormat'
import { buildDocumentTree } from './buildDocumentTree'
import { DocumentTree } from './DocumentTree'
import { resolveDocumentTreeSelectEffect } from './documentTreeSelectActions'
import { highlightsFromAssemblyMate } from './mateHighlightsFromTree'
import type { DocumentTreeContextActionId, DocumentTreeNode } from './model'
import { resolveDocumentTreeEditAction } from './resolveDocumentTreeEditAction'
import type { PartLockMap } from './partLock'
import { shouldClearDocumentTreeNodeSelection } from '../viewer-selection'
import styles from './DocumentTree.module.css'

export type DocumentTreeOverlayProps = {
  mainModel: BufferGeometry | null
  mainFileName: string | null
  mainFaceConstraints?: readonly FaceConstraint[]
  mainModelElements?: PreparedElementConstraints['modelElements']
  assemblyName: string
  programParts: readonly PreAssemblyProgramPart[]
  programPartGeometries: Readonly<Record<string, BufferGeometry | undefined>>
  programPartConstraints: Readonly<Record<string, PreparedElementConstraints | undefined>>
  assemblyMates: readonly AssemblyMate[]
  activeProgramPartId: string | null
  partLocks: PartLockMap
  onActivePartChange: (partId: string | null) => void
  onTogglePartLock: (partId: string) => void
  onRemovePart?: (partId: string) => void
  onEditAppearance: (partId: string | null) => void
  onTreeMateHighlightsChange: (highlights: MateEntityHighlights | null) => void
  onHighlightElementFaces?: (partId: string | null, faceIndices: number[]) => void
  onDeleteMate?: (mateId: string) => void
  onToggleMateSuppressed?: (mateId: string) => void
  onApplySizeEdit?: (node: DocumentTreeNode, payload: SizeEditApplyPayload) => void
  onRemoveSizeLimit?: (node: DocumentTreeNode) => void
  onRenameSize?: (node: DocumentTreeNode, displayName: string) => void
  /** Zmiana name w programie montażu — bez zapisu .ecdprt. */
  onRenamePart?: (node: DocumentTreeNode, displayName: string) => void
  onAddCustomSize?: (partId: string | null) => void
  selectionClearEpoch?: number
  /** Po stretch in-place ta sama ref geometrii — wymusza przeliczenie sizeMm w drzewie. */
  geometryRevision?: number
}

export function DocumentTreeOverlay({
  mainModel,
  mainFileName,
  mainFaceConstraints = [],
  mainModelElements = [],
  assemblyName,
  programParts,
  programPartGeometries,
  programPartConstraints,
  assemblyMates,
  activeProgramPartId,
  partLocks,
  onActivePartChange,
  onTogglePartLock,
  onRemovePart,
  onEditAppearance,
  onTreeMateHighlightsChange,
  onHighlightElementFaces,
  onDeleteMate,
  onToggleMateSuppressed,
  onApplySizeEdit,
  onRemoveSizeLimit,
  onRenameSize,
  onRenamePart,
  onAddCustomSize,
  selectionClearEpoch = 0,
  geometryRevision = 0,
}: DocumentTreeOverlayProps) {
  const { t } = useTranslation()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useEffect(() => {
    if (!shouldClearDocumentTreeNodeSelection(selectionClearEpoch)) return
    setSelectedNodeId(null)
  }, [selectionClearEpoch])

  const partDisplayNameById = useMemo(
    () => buildProgramPartDisplayNameById(programParts),
    [programParts],
  )

  const partSizeMmById = useMemo(() => {
    const map: Record<string, { x: number; y: number; z: number }> = {}
    for (const part of programParts) {
      const raw = geometryExtentMm(programPartGeometries[part.id]).sizeMm
      // Tylko szum float — siatkę kroku nakłada buildDocumentTree wg editable / lockedByCustom
      map[part.id] = {
        x: cleanSizeMmFloat(raw.x),
        y: cleanSizeMmFloat(raw.y),
        z: cleanSizeMmFloat(raw.z),
      }
    }
    return map
    // geometryRevision: bbox po stretch in-place
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision forces remeasure
  }, [programParts, programPartGeometries, geometryRevision])

  const modelElementsByPartId = useMemo(() => {
    const map: Record<string, PreparedElementConstraints['modelElements']> = {}
    for (const part of programParts) {
      map[part.id] = programPartConstraints[part.id]?.modelElements
    }
    return map
  }, [programParts, programPartConstraints])

  const faceConstraintsByPartId = useMemo(() => {
    const map: Record<string, readonly FaceConstraint[] | undefined> = {}
    for (const part of programParts) {
      map[part.id] = programPartConstraints[part.id]?.faceConstraints
    }
    return map
  }, [programParts, programPartConstraints])

  const root = useMemo(
    () =>
      buildDocumentTree({
        partRootLabel: mainFileName ?? t('documentTree.untitledPart'),
        partSizeMm: mainModel
          ? (() => {
              const raw = geometryExtentMm(mainModel).sizeMm
              return {
                x: cleanSizeMmFloat(raw.x),
                y: cleanSizeMmFloat(raw.y),
                z: cleanSizeMmFloat(raw.z),
              }
            })()
          : null,
        hasPartModel: !!mainModel,
        mainGeometry: mainModel,
        mainFaceConstraints,
        mainModelElements: mainModelElements ?? [],
        assemblyName: assemblyName || t('documentTree.untitledAssembly'),
        programParts,
        partDisplayNameById,
        partSizeMmById,
        modelElementsByPartId,
        partGeometryById: programPartGeometries,
        faceConstraintsByPartId,
        mates: assemblyMates,
        partLocks,
      }),
    [
      mainFileName,
      mainModel,
      mainFaceConstraints,
      mainModelElements,
      assemblyName,
      programParts,
      partDisplayNameById,
      partSizeMmById,
      modelElementsByPartId,
      programPartGeometries,
      faceConstraintsByPartId,
      assemblyMates,
      partLocks,
      geometryRevision,
      t,
    ],
  )

  const findMate = useCallback(
    (mateId: string | undefined) =>
      mateId ? assemblyMates.find((m) => m.id === mateId) : undefined,
    [assemblyMates],
  )

  const matesById = useMemo(() => {
    const map: Record<string, AssemblyMate> = {}
    for (const mate of assemblyMates) {
      map[mate.id] = mate
    }
    return map
  }, [assemblyMates])

  const handleSelectNode = useCallback(
    (node: DocumentTreeNode) => {
      setSelectedNodeId(node.id)
      const effect = resolveDocumentTreeSelectEffect(node, {
        matesById,
        modelElementsByPartId,
      })
      if (effect.kind === 'activatePart') {
        onActivePartChange(effect.partId)
        return
      }
      if (effect.kind === 'highlightMate') {
        onTreeMateHighlightsChange(effect.highlights)
        return
      }
      if (effect.kind === 'highlightElement') {
        onActivePartChange(effect.partId)
        onHighlightElementFaces?.(effect.partId, effect.faceIndices)
        return
      }
      if (effect.kind === 'highlightSize') {
        if (effect.partId) onActivePartChange(effect.partId)
        onHighlightElementFaces?.(effect.partId, effect.faceIndices)
      }
    },
    [
      matesById,
      modelElementsByPartId,
      onActivePartChange,
      onHighlightElementFaces,
      onTreeMateHighlightsChange,
    ],
  )

  const handleContextAction = useCallback(
    (action: DocumentTreeContextActionId, node: DocumentTreeNode) => {
      switch (action) {
        case 'select':
          if (node.partId) onActivePartChange(node.partId)
          setSelectedNodeId(node.id)
          break
        case 'lock':
        case 'unlock':
          if (node.partId) onTogglePartLock(node.partId)
          break
        case 'removePart':
          if (node.partId && onRemovePart) onRemovePart(node.partId)
          break
        case 'editAppearance':
          onEditAppearance(node.partId ?? null)
          break
        case 'copySize':
          if (node.sizeMm != null && Number.isFinite(node.sizeMm)) {
            void navigator.clipboard?.writeText(
              String(sizeMmForUi(node.sizeMm, resolveSizeStepMm)),
            )
          }
          break
        case 'addCustomSize':
          onAddCustomSize?.(node.partId ?? activeProgramPartId)
          break
        case 'editSize':
          setSelectedNodeId(node.id)
          break
        case 'renameSize':
        case 'renamePart':
          setSelectedNodeId(node.id)
          break
        case 'highlightElement':
          if (node.partId && node.elementId) {
            const elements = programPartConstraints[node.partId]?.modelElements ?? []
            const el = elements.find((e) => e.id === node.elementId)
            if (el && onHighlightElementFaces) {
              onActivePartChange(node.partId)
              onHighlightElementFaces(node.partId, [...el.faceIndices])
            }
          }
          break
        case 'highlightMate':
          if (node.mateId) {
            onTreeMateHighlightsChange(highlightsFromAssemblyMate(findMate(node.mateId)) ?? null)
          }
          break
        case 'clearMateHighlight':
          onTreeMateHighlightsChange(null)
          break
        case 'suppressMate':
        case 'unsuppressMate':
          if (node.mateId) onToggleMateSuppressed?.(node.mateId)
          break
        case 'deleteMate':
          if (node.mateId) onDeleteMate?.(node.mateId)
          break
        default:
          break
      }
    },
    [
      activeProgramPartId,
      findMate,
      onActivePartChange,
      onAddCustomSize,
      onDeleteMate,
      onEditAppearance,
      onHighlightElementFaces,
      onRemovePart,
      onToggleMateSuppressed,
      onTogglePartLock,
      onTreeMateHighlightsChange,
      programPartConstraints,
    ],
  )

  const handleEditNode = useCallback(
    (node: DocumentTreeNode) => {
      setSelectedNodeId(node.id)
      const edit = resolveDocumentTreeEditAction(node)
      if (edit.kind !== 'contextAction') return
      // editSize: UI lokalne w DocumentTree (+ podświetlenie płaszczyzn)
      if (edit.action === 'editSize') {
        if (node.faceIndices && node.faceIndices.length > 0) {
          if (node.partId) onActivePartChange(node.partId)
          onHighlightElementFaces?.(node.partId ?? null, node.faceIndices)
        }
        return
      }
      // appearance i inne — ten sam handler co menu kontekstowe
      handleContextAction(edit.action, node)
    },
    [handleContextAction, onActivePartChange, onHighlightElementFaces],
  )

  if (!root) {
    return null
  }

  return (
    <div className={styles.overlayRoot}>
      <div className={styles.panel}>
        <DocumentTree
          root={root}
          activePartId={activeProgramPartId}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          onEditNode={handleEditNode}
          onRenameSize={onRenameSize}
          onRenamePart={onRenamePart}
          onApplySizeEdit={onApplySizeEdit}
          onRemoveSizeLimit={onRemoveSizeLimit}
          onContextAction={handleContextAction}
        />
      </div>
    </div>
  )
}
