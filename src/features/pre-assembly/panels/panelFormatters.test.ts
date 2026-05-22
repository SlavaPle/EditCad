import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { createEmptyPhantomFile } from '../phantomStore'
import {
  formatConnectionSummary,
  formatDimensionSpec,
  formatEnvelopeSummary,
  formatParameterSource,
} from './panelFormatters'

const t = ((key: string, opts?: Record<string, unknown>) => {
  if (opts) {
    return `${key}:${JSON.stringify(opts)}`
  }
  return key
}) as TFunction

describe('panelFormatters', () => {
  it('formatDimensionSpec renders literal and param refs', () => {
    expect(formatDimensionSpec(18, t)).toContain('18')
    expect(formatDimensionSpec({ paramId: 'thickness' }, t)).toContain('thickness')
  })

  it('formatEnvelopeSummary includes phantom kind and dimensions', () => {
    const file = createEmptyPhantomFile()
    const summary = formatEnvelopeSummary(file.phantom.envelope, t)
    expect(summary).toContain('phantomKind.panel')
    expect(summary).toContain('600')
  })

  it('formatParameterSource describes literal and fromElement', () => {
    expect(
      formatParameterSource({ id: 'p1', kind: 'literal', valueMm: 12 }, t),
    ).toContain('12')
    expect(
      formatParameterSource(
        { id: 'p2', kind: 'fromElement', elementId: 'panel', property: 'thickness' },
        t,
      ),
    ).toContain('panel')
  })

  it('formatConnectionSummary joins endpoints and rule', () => {
    const file = createEmptyPhantomFile()
    const phantom = {
      ...file.phantom,
      attachments: [
        { id: 'floor', role: 'floor' as const, source: { kind: 'boxFace' as const, face: 'posY' as const } },
      ],
      elements: [
        {
          id: 'panel',
          binding: 'rigid' as const,
          anchorId: 'floor',
          ref: 'panel.ecdprt',
        },
      ],
      connections: [
        {
          id: 'c1',
          bindingKind: 'rigid' as const,
          endpointA: { kind: 'element' as const, elementId: 'panel' },
          endpointB: { kind: 'anchor' as const, anchorId: 'floor' },
          rule: { kind: 'coincident' as const },
        },
      ],
    }
    const summary = formatConnectionSummary(phantom.connections[0]!, phantom, t)
    expect(summary).toContain('connection.summary')
  })
})
