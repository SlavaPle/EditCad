import { describe, expect, it } from 'vitest'
import {
  classifyDocumentTreeSizeClick,
  DOCUMENT_TREE_RENAME_CLICK_GAP_MS,
  initialDocumentTreeClickTimingState,
} from './documentTreeClickTiming'

describe('classifyDocumentTreeSizeClick', () => {
  it('first click is select', () => {
    const r = classifyDocumentTreeSizeClick({
      nodeId: 'size:x',
      detail: 1,
      nowMs: 1000,
      state: initialDocumentTreeClickTimingState(),
      isSelected: false,
    })
    expect(r.kind).toBe('select')
  })

  it('double click is editValue', () => {
    const r = classifyDocumentTreeSizeClick({
      nodeId: 'size:x',
      detail: 2,
      nowMs: 1000,
      state: { nodeId: 'size:x', lastClickAt: 990 },
      isSelected: true,
    })
    expect(r.kind).toBe('editValue')
  })

  it('slow second single click on selected is renameCandidate', () => {
    const r = classifyDocumentTreeSizeClick({
      nodeId: 'size:x',
      detail: 1,
      nowMs: 1000 + DOCUMENT_TREE_RENAME_CLICK_GAP_MS,
      state: { nodeId: 'size:x', lastClickAt: 1000 },
      isSelected: true,
    })
    expect(r.kind).toBe('renameCandidate')
  })

  it('fast second single click stays select (nie kradnie dblclick)', () => {
    const r = classifyDocumentTreeSizeClick({
      nodeId: 'size:x',
      detail: 1,
      nowMs: 1100,
      state: { nodeId: 'size:x', lastClickAt: 1000 },
      isSelected: true,
    })
    expect(r.kind).toBe('select')
  })
})
