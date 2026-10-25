import { describe, expect, it } from 'vitest'
import { getDocumentSessionToolbarUi, resolveDocumentSessionKind } from './resolveDocumentSession'

describe('resolveDocumentSessionKind', () => {
  it('treats program parts as assembly', () => {
    expect(
      resolveDocumentSessionKind({
        hasMainModel: false,
        programPartCount: 2,
        hasPhantom: false,
      }),
    ).toBe('assembly')
  })

  it('treats phantom-only as assembly', () => {
    expect(
      resolveDocumentSessionKind({
        hasMainModel: true,
        programPartCount: 0,
        hasPhantom: true,
      }),
    ).toBe('assembly')
  })

  it('treats lone main model as part', () => {
    expect(
      resolveDocumentSessionKind({
        hasMainModel: true,
        programPartCount: 0,
        hasPhantom: false,
      }),
    ).toBe('part')
  })

  it('returns empty when nothing loaded', () => {
    expect(
      resolveDocumentSessionKind({
        hasMainModel: false,
        programPartCount: 0,
        hasPhantom: false,
      }),
    ).toBe('empty')
  })
})

describe('getDocumentSessionToolbarUi', () => {
  it('routes save to assembly and enables assembly actions', () => {
    const ui = getDocumentSessionToolbarUi({
      hasMainModel: false,
      programPartCount: 1,
      hasPhantom: false,
    })
    expect(ui.saveTarget).toBe('assembly')
    expect(ui.canSave).toBe(true)
    expect(ui.canAddPart).toBe(true)
    expect(ui.canCreatePhantom).toBe(true)
    expect(ui.canCreateAttachment).toBe(false)
  })

  it('enables attachment when assembly has phantom', () => {
    const ui = getDocumentSessionToolbarUi({
      hasMainModel: false,
      programPartCount: 1,
      hasPhantom: true,
    })
    expect(ui.canCreateAttachment).toBe(true)
  })

  it('routes save to part and disables assembly actions', () => {
    const ui = getDocumentSessionToolbarUi({
      hasMainModel: true,
      programPartCount: 0,
      hasPhantom: false,
    })
    expect(ui.saveTarget).toBe('part')
    expect(ui.canSave).toBe(true)
    expect(ui.canAddPart).toBe(false)
    expect(ui.canCreatePhantom).toBe(false)
    expect(ui.canCreateAttachment).toBe(false)
  })

  it('allows starting assembly from empty session', () => {
    const ui = getDocumentSessionToolbarUi({
      hasMainModel: false,
      programPartCount: 0,
      hasPhantom: false,
    })
    expect(ui.saveTarget).toBe(null)
    expect(ui.canSave).toBe(false)
    expect(ui.canAddPart).toBe(true)
    expect(ui.canCreatePhantom).toBe(true)
    expect(ui.canCreateAttachment).toBe(false)
  })
})
