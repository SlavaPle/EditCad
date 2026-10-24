import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  collectExpandableNodeIds,
  findDocumentTreeNode,
} from './buildDocumentTree'
import { DocumentTreeContextMenu } from './DocumentTreeContextMenu'
import { DocumentTreeFittedSizePopup } from './DocumentTreeFittedSizePopup'
import { DocumentTreeIcon } from './DocumentTreeIcons'
import { DocumentTreeSizeEditPanel } from './DocumentTreeSizeEditPanel'
import { DocumentTreeSizeHoverControls } from './DocumentTreeSizeHoverControls'
import { DocumentTreeSizeStatusIcon } from './DocumentTreeSizeStatusIcon'
import {
  classifyDocumentTreeSizeClick,
  DOCUMENT_TREE_RENAME_DEFER_MS,
  initialDocumentTreeClickTimingState,
  type DocumentTreeClickTimingState,
} from './documentTreeClickTiming'
import { isRemovableSizeLimit } from './isRemovableSizeLimit'
import { isSizeLockedByCustom } from './isSizeLockedByCustom'
import type {
  DocumentTreeContextActionId,
  DocumentTreeContextMenuState,
  DocumentTreeNode,
  DocumentTreeNodeKind,
} from './model'
import type { SizeEditApplyPayload } from './sizeEditApplyPayload'
import styles from './DocumentTree.module.css'

const HOVER_CLEAR_MS = 120
const RENAME_BLUR_READY_MS = 80

function labelForKind(kind: DocumentTreeNodeKind, fallback: string, t: (key: string) => string): string {
  switch (kind) {
    case 'model':
      return t('documentTree.nodes.model')
    case 'appearance':
      return t('documentTree.nodes.appearance')
    case 'elementsGroup':
      return t('documentTree.nodes.elements')
    case 'matesGroup':
      return t('documentTree.nodes.mates')
    case 'sizesGroup':
      return t('documentTree.nodes.sizes')
    default:
      return fallback
  }
}

function isSizeKind(kind: DocumentTreeNodeKind): boolean {
  return kind === 'size' || kind === 'sizeCustom'
}

function sizeLimitTypeOf(node: DocumentTreeNode) {
  return node.sizeStatus === 'min' ||
    node.sizeStatus === 'max' ||
    node.sizeStatus === 'minmax' ||
    node.sizeStatus === 'const'
    ? node.sizeStatus
    : ('free' as const)
}

export type DocumentTreeProps = {
  root: DocumentTreeNode
  activePartId: string | null
  selectedNodeId: string | null
  onSelectNode: (node: DocumentTreeNode) => void
  onEditNode: (node: DocumentTreeNode) => void
  onRenameSize?: (node: DocumentTreeNode, displayName: string) => void
  /** Tylko program montażu (.ecdasm) — bez zapisu do .ecdprt. */
  onRenamePart?: (node: DocumentTreeNode, displayName: string) => void
  onApplySizeEdit?: (node: DocumentTreeNode, payload: SizeEditApplyPayload) => void
  onRemoveSizeLimit?: (node: DocumentTreeNode) => void
  onContextAction: (action: DocumentTreeContextActionId, node: DocumentTreeNode) => void
}

function TreeNodeRow({
  node,
  depth,
  expandedIds,
  activePartId,
  selectedNodeId,
  editingSizeId,
  renamingSizeId,
  hoveredSizeId,
  onKeepSizeHover,
  onClearSizeHoverSoon,
  onToggleExpand,
  onSelect,
  onEdit,
  onStartRename,
  onSizeLabelClick,
  onPartLabelClick,
  onCommitRename,
  onCancelRename,
  onApplySizeEdit,
  onRemoveSizeLimit,
  onCancelSizeEdit,
  onContextMenu,
  onSizePopupAnchor,
}: {
  node: DocumentTreeNode
  depth: number
  expandedIds: ReadonlySet<string>
  activePartId: string | null
  selectedNodeId: string | null
  editingSizeId: string | null
  renamingSizeId: string | null
  hoveredSizeId: string | null
  onKeepSizeHover: (id: string) => void
  onClearSizeHoverSoon: () => void
  onToggleExpand: (id: string) => void
  onSelect: (node: DocumentTreeNode) => void
  onEdit: (node: DocumentTreeNode) => void
  onStartRename: (node: DocumentTreeNode) => void
  onSizeLabelClick: (node: DocumentTreeNode, detail: number) => void
  onPartLabelClick: (node: DocumentTreeNode, detail: number) => void
  onCommitRename: (node: DocumentTreeNode, name: string) => void
  onCancelRename: () => void
  onApplySizeEdit: (node: DocumentTreeNode, payload: SizeEditApplyPayload) => void
  onRemoveSizeLimit?: (node: DocumentTreeNode) => void
  onCancelSizeEdit: () => void
  onContextMenu: (e: MouseEvent, node: DocumentTreeNode) => void
  onSizePopupAnchor: (nodeId: string, rect: DOMRect | null) => void
}) {
  const { t } = useTranslation()
  const rowRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const renameReadyRef = useRef(false)
  const hasChildren = (node.children?.length ?? 0) > 0
  const expanded = expandedIds.has(node.id)
  const isSelected =
    selectedNodeId === node.id ||
    (node.kind === 'part' && node.partId != null && node.partId === activePartId)
  const sizeLocked = isSizeKind(node.kind) && node.editable === false
  // lockedByCustom: edycja tylko na sizeCustom — nie otwieraj panelu na Y/Z
  const canOpenSizeEdit =
    isSizeKind(node.kind) &&
    !isSizeLockedByCustom(node) &&
    (node.editable !== false || Boolean(node.constraintId)) &&
    (node.faceIndices?.length ?? 0) >= 2
  const isEditing = editingSizeId === node.id
  const isRenaming = renamingSizeId === node.id
  const isHovered = hoveredSizeId === node.id
  const showHoverControls =
    isSizeKind(node.kind) && isHovered && !isEditing && !isRenaming && canOpenSizeEdit
  const showSizePopup = showHoverControls || isEditing
  const displayLabel = labelForKind(node.kind, node.label, t)
  const renameSeed = node.displayName?.trim() || node.label || ''
  const [renameText, setRenameText] = useState(renameSeed)

  const clearHoverSoon = () => {
    onClearSizeHoverSoon()
  }

  const keepHover = () => {
    if (isSizeKind(node.kind) && !isRenaming) onKeepSizeHover(node.id)
  }

  useEffect(() => {
    if (!isRenaming) {
      renameReadyRef.current = false
      return
    }
    renameReadyRef.current = false
    setRenameText(node.displayName?.trim() || node.label || '')
    const tId = window.setTimeout(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
      renameReadyRef.current = true
    }, RENAME_BLUR_READY_MS)
    return () => window.clearTimeout(tId)
  }, [isRenaming, node.displayName, node.label])

  useLayoutEffect(() => {
    if (!showSizePopup) {
      onSizePopupAnchor(node.id, null)
      return
    }
    const el = rowRef.current
    if (!el) return
    const publish = () => onSizePopupAnchor(node.id, el.getBoundingClientRect())
    publish()
    window.addEventListener('resize', publish)
    window.addEventListener('scroll', publish, true)
    return () => {
      window.removeEventListener('resize', publish)
      window.removeEventListener('scroll', publish, true)
      onSizePopupAnchor(node.id, null)
    }
  }, [showSizePopup, node.id, onSizePopupAnchor, displayLabel, node.sizeMm])

  return (
    <li
      onMouseEnter={keepHover}
      onMouseLeave={() => {
        if (!isSizeKind(node.kind)) return
        clearHoverSoon()
      }}
    >
      <div
        ref={rowRef}
        className={[
          styles.row,
          isSelected ? styles.rowSelected : '',
          node.suppressed ? styles.rowSuppressed : '',
          sizeLocked ? styles.rowSizeLocked : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ paddingLeft: 4 + depth * 2 }}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {hasChildren ? (
          <button
            type="button"
            className={styles.expandBtn}
            aria-expanded={expanded}
            aria-label={expanded ? t('documentTree.collapse') : t('documentTree.expand')}
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(node.id)
            }}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className={styles.expandSpacer} />
        )}
        {isSizeKind(node.kind) ? (
          <div
            className={styles.sizeHit}
            onClick={(e) => {
              if (isRenaming) return
              onSizeLabelClick(node, e.detail)
            }}
            onDoubleClick={(e) => {
              if (isRenaming) return
              e.preventDefault()
              e.stopPropagation()
              onEdit(node)
            }}
          >
            <span className={styles.icon}>
              <DocumentTreeIcon kind={node.kind} axis={node.axis} locked={node.locked} />
            </span>
            <span className={styles.sizeStatusIcon} title={node.sizeStatus}>
              <DocumentTreeSizeStatusIcon status={node.sizeStatus} />
            </span>
            {isRenaming ? (
              <input
                ref={renameInputRef}
                className={styles.sizeRenameInput}
                value={renameText}
                aria-label={t('documentTree.size.renameAria')}
                onChange={(e) => setRenameText(e.target.value)}
                onBlur={() => {
                  if (!renameReadyRef.current) return
                  onCommitRename(node, renameText)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    renameReadyRef.current = true
                    onCommitRename(node, renameText)
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    onCancelRename()
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={styles.sizeHitLabel} title={displayLabel}>
                {displayLabel}
              </span>
            )}
          </div>
        ) : (
          <>
            <span className={styles.icon}>
              <DocumentTreeIcon kind={node.kind} axis={node.axis} locked={node.locked} />
            </span>
            {isRenaming && node.kind === 'part' ? (
              <input
                ref={renameInputRef}
                className={styles.sizeRenameInput}
                value={renameText}
                aria-label={t('documentTree.part.renameAria')}
                onChange={(e) => setRenameText(e.target.value)}
                onBlur={() => {
                  if (!renameReadyRef.current) return
                  onCommitRename(node, renameText)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    renameReadyRef.current = true
                    onCommitRename(node, renameText)
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    onCancelRename()
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <button
                type="button"
                className={styles.label}
                onClick={(e) => {
                  if (node.kind === 'part') {
                    onPartLabelClick(node, e.detail)
                    return
                  }
                  onSelect(node)
                }}
                onDoubleClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (node.kind === 'part') {
                    onPartLabelClick(node, e.detail)
                    return
                  }
                  onEdit(node)
                }}
                title={displayLabel}
              >
                {displayLabel}
              </button>
            )}
          </>
        )}
      </div>
      {hasChildren && expanded ? (
        <ul className={styles.treeListNested}>
          {node.children!.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              activePartId={activePartId}
              selectedNodeId={selectedNodeId}
              editingSizeId={editingSizeId}
              renamingSizeId={renamingSizeId}
              hoveredSizeId={hoveredSizeId}
              onKeepSizeHover={onKeepSizeHover}
              onClearSizeHoverSoon={onClearSizeHoverSoon}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onEdit={onEdit}
              onStartRename={onStartRename}
              onSizeLabelClick={onSizeLabelClick}
              onPartLabelClick={onPartLabelClick}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
              onApplySizeEdit={onApplySizeEdit}
              onRemoveSizeLimit={onRemoveSizeLimit}
              onCancelSizeEdit={onCancelSizeEdit}
              onContextMenu={onContextMenu}
              onSizePopupAnchor={onSizePopupAnchor}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function DocumentTree({
  root,
  activePartId,
  selectedNodeId,
  onSelectNode,
  onEditNode,
  onRenameSize,
  onRenamePart,
  onApplySizeEdit,
  onRemoveSizeLimit,
  onContextAction,
}: DocumentTreeProps) {
  const { t } = useTranslation()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(collectExpandableNodeIds(root)),
  )
  const [menu, setMenu] = useState<DocumentTreeContextMenuState | null>(null)
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null)
  const [renamingSizeId, setRenamingSizeId] = useState<string | null>(null)
  const [hoveredSizeId, setHoveredSizeId] = useState<string | null>(null)
  const [popupAnchor, setPopupAnchor] = useState<{ nodeId: string; rect: DOMRect } | null>(null)
  // Jeden timer dla wierszy + portalu — osobne timery wierszy kasowały hover po wejściu w popup
  const sizeHoverClearRef = useRef<number | null>(null)
  const sizeClickTimingRef = useRef<DocumentTreeClickTimingState>(initialDocumentTreeClickTimingState())
  const renameDeferTimerRef = useRef<number | null>(null)

  const clearRenameDeferTimer = useCallback(() => {
    if (renameDeferTimerRef.current != null) {
      window.clearTimeout(renameDeferTimerRef.current)
      renameDeferTimerRef.current = null
    }
  }, [])

  const clearSizeHoverTimer = useCallback(() => {
    if (sizeHoverClearRef.current != null) {
      window.clearTimeout(sizeHoverClearRef.current)
      sizeHoverClearRef.current = null
    }
  }, [])

  const keepSizeHover = useCallback(
    (id: string) => {
      clearSizeHoverTimer()
      setHoveredSizeId(id)
    },
    [clearSizeHoverTimer],
  )

  const clearSizeHoverSoon = useCallback(() => {
    clearSizeHoverTimer()
    sizeHoverClearRef.current = window.setTimeout(() => {
      sizeHoverClearRef.current = null
      setHoveredSizeId(null)
    }, HOVER_CLEAR_MS)
  }, [clearSizeHoverTimer])

  useEffect(() => () => {
    clearSizeHoverTimer()
    clearRenameDeferTimer()
  }, [clearSizeHoverTimer, clearRenameDeferTimer])

  const rootId = root.id
  useEffect(() => {
    clearSizeHoverTimer()
    clearRenameDeferTimer()
    setExpandedIds(new Set(collectExpandableNodeIds(root)))
    setMenu(null)
    setEditingSizeId(null)
    setRenamingSizeId(null)
    setHoveredSizeId(null)
    setPopupAnchor(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- root.id
  }, [rootId])

  const handleSizePopupAnchor = useCallback((nodeId: string, rect: DOMRect | null) => {
    setPopupAnchor((prev) => {
      if (!rect) {
        if (prev?.nodeId === nodeId) return null
        return prev
      }
      return { nodeId, rect }
    })
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleContextMenu = useCallback((e: MouseEvent, node: DocumentTreeNode) => {
    e.preventDefault()
    e.stopPropagation()
    // Schowaj hover-popup, żeby nie zasłaniał menu (z-index / pointer-events)
    clearSizeHoverTimer()
    setHoveredSizeId(null)
    setPopupAnchor(null)
    setMenu({ x: e.clientX, y: e.clientY, nodeId: node.id })
  }, [clearSizeHoverTimer])

  const menuNode = menu ? findDocumentTreeNode(root, menu.nodeId) : null

  const startRename = useCallback(
    (node: DocumentTreeNode) => {
      if (!isSizeKind(node.kind) && node.kind !== 'part') return
      clearRenameDeferTimer()
      clearSizeHoverTimer()
      setEditingSizeId(null)
      setHoveredSizeId(null)
      setPopupAnchor(null)
      setRenamingSizeId(node.id)
    },
    [clearRenameDeferTimer, clearSizeHoverTimer],
  )

  const beginEditValue = useCallback(
    (node: DocumentTreeNode) => {
      clearRenameDeferTimer()
      setRenamingSizeId(null)
      setEditingSizeId(node.id)
      onEditNode(node)
    },
    [clearRenameDeferTimer, onEditNode],
  )

  const handleSizeLabelClick = useCallback(
    (node: DocumentTreeNode, detail: number) => {
      const selected = selectedNodeId === node.id
      const { kind, nextState } = classifyDocumentTreeSizeClick({
        nodeId: node.id,
        detail,
        nowMs: Date.now(),
        state: sizeClickTimingRef.current,
        isSelected: selected,
      })
      sizeClickTimingRef.current = nextState
      if (kind === 'editValue') {
        beginEditValue(node)
        return
      }
      if (kind === 'renameCandidate') {
        // Nie podmieniaj label→input od razu — 2. klik dblclick musi trafić w button
        clearRenameDeferTimer()
        renameDeferTimerRef.current = window.setTimeout(() => {
          renameDeferTimerRef.current = null
          startRename(node)
        }, DOCUMENT_TREE_RENAME_DEFER_MS)
        return
      }
      clearRenameDeferTimer()
      onSelectNode(node)
    },
    [beginEditValue, clearRenameDeferTimer, onSelectNode, selectedNodeId, startRename],
  )

  const handlePartLabelClick = useCallback(
    (node: DocumentTreeNode, detail: number) => {
      const selected = selectedNodeId === node.id
      const { kind, nextState } = classifyDocumentTreeSizeClick({
        nodeId: node.id,
        detail,
        nowMs: Date.now(),
        state: sizeClickTimingRef.current,
        isSelected: selected,
      })
      sizeClickTimingRef.current = nextState
      if (kind === 'editValue') {
        // Dblclick na detalu — bez edycji limitu; anuluj odłożony rename
        clearRenameDeferTimer()
        onSelectNode(node)
        return
      }
      if (kind === 'renameCandidate') {
        clearRenameDeferTimer()
        renameDeferTimerRef.current = window.setTimeout(() => {
          renameDeferTimerRef.current = null
          startRename(node)
        }, DOCUMENT_TREE_RENAME_DEFER_MS)
        return
      }
      clearRenameDeferTimer()
      onSelectNode(node)
    },
    [clearRenameDeferTimer, onSelectNode, selectedNodeId, startRename],
  )

  const handleMenuAction = useCallback(
    (action: DocumentTreeContextActionId) => {
      if (!menuNode) return
      if (action === 'expandAll') {
        setExpandedIds(new Set(collectExpandableNodeIds(root)))
        return
      }
      if (action === 'collapseAll') {
        setExpandedIds(new Set())
        return
      }
      if (action === 'editSize') {
        beginEditValue(menuNode)
        return
      }
      if (action === 'renameSize' || action === 'renamePart') {
        startRename(menuNode)
        return
      }
      if (action === 'removeSizeLimit') {
        if (!isRemovableSizeLimit(menuNode)) {
          return
        }
        setEditingSizeId(null)
        onRemoveSizeLimit?.(menuNode)
        return
      }
      onContextAction(action, menuNode)
    },
    [menuNode, onContextAction, onRemoveSizeLimit, root, startRename, beginEditValue],
  )

  const handleEdit = useCallback(
    (node: DocumentTreeNode) => {
      if (isSizeKind(node.kind)) {
        beginEditValue(node)
        return
      }
      onEditNode(node)
    },
    [beginEditValue, onEditNode],
  )

  const popupNodeId = editingSizeId ?? hoveredSizeId
  const popupNode =
    popupNodeId && popupAnchor?.nodeId === popupNodeId
      ? findDocumentTreeNode(root, popupNodeId)
      : null
  const showHoverPopup =
    popupNode != null &&
    hoveredSizeId === popupNode.id &&
    editingSizeId !== popupNode.id &&
    renamingSizeId !== popupNode.id
  const showEditPopup = popupNode != null && editingSizeId === popupNode.id

  const keepPopupHover = () => {
    if (popupNode) keepSizeHover(popupNode.id)
  }

  return (
    <>
      <ul className={styles.treeList} aria-label={t('documentTree.title')}>
        <TreeNodeRow
          node={root}
          depth={0}
          expandedIds={expandedIds}
          activePartId={activePartId}
          selectedNodeId={selectedNodeId}
          editingSizeId={editingSizeId}
          renamingSizeId={renamingSizeId}
          hoveredSizeId={hoveredSizeId}
          onKeepSizeHover={keepSizeHover}
          onClearSizeHoverSoon={clearSizeHoverSoon}
          onToggleExpand={toggleExpand}
          onSelect={onSelectNode}
          onEdit={handleEdit}
          onStartRename={startRename}
          onSizeLabelClick={handleSizeLabelClick}
          onPartLabelClick={handlePartLabelClick}
          onCommitRename={(n, name) => {
            setRenamingSizeId(null)
            const trimmed = name.trim()
            if (n.kind === 'part') {
              onRenamePart?.(n, trimmed)
              return
            }
            onRenameSize?.(n, trimmed)
          }}
          onCancelRename={() => setRenamingSizeId(null)}
          onApplySizeEdit={(n, payload) => onApplySizeEdit?.(n, payload)}
          onRemoveSizeLimit={onRemoveSizeLimit}
          onCancelSizeEdit={() => setEditingSizeId(null)}
          onContextMenu={handleContextMenu}
          onSizePopupAnchor={handleSizePopupAnchor}
        />
      </ul>
      {menu && menuNode ? (
        <DocumentTreeContextMenu
          x={menu.x}
          y={menu.y}
          node={menuNode}
          onAction={handleMenuAction}
          onClose={() => setMenu(null)}
        />
      ) : null}
      {(showHoverPopup || showEditPopup) && popupNode && popupAnchor ? (
        <DocumentTreeFittedSizePopup
          // Na prawo od wiersza — ścieżka myszy nie przecina X/Y/Z poniżej
          top={popupAnchor.rect.top}
          left={popupAnchor.rect.right + 4}
          onMouseEnter={keepPopupHover}
          onMouseLeave={clearSizeHoverSoon}
        >
          {showHoverPopup ? (
            <DocumentTreeSizeHoverControls
              initialMm={popupNode.sizeMm ?? null}
              limitMinMm={popupNode.limitMinMm}
              limitMaxMm={popupNode.limitMaxMm}
              limitType={sizeLimitTypeOf(popupNode)}
              disabled={popupNode.sizeStatus === 'const'}
              onApply={(payload) => onApplySizeEdit?.(popupNode, payload)}
            />
          ) : null}
          {showEditPopup ? (
            <DocumentTreeSizeEditPanel
              initialMm={popupNode.sizeMm ?? null}
              initialMinMm={popupNode.limitMinMm}
              initialMaxMm={popupNode.limitMaxMm}
              constraintId={popupNode.constraintId}
              constraintType={sizeLimitTypeOf(popupNode)}
              onApply={(payload) => {
                onApplySizeEdit?.(popupNode, payload)
                setEditingSizeId(null)
              }}
              onCancel={() => setEditingSizeId(null)}
              onRemoveLimit={
                onRemoveSizeLimit && isRemovableSizeLimit(popupNode)
                  ? () => {
                      setEditingSizeId(null)
                      onRemoveSizeLimit(popupNode)
                    }
                  : undefined
              }
            />
          ) : null}
        </DocumentTreeFittedSizePopup>
      ) : null}
    </>
  )
}
