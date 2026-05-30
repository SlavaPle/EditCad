import { describe, expect, it } from 'vitest'
import { Plane, Ray, Vector3 } from 'three'
import {
  beginProgramPartPointerSession,
  computeRotateTransform,
  computeTranslateTransform,
  createProgramPartDragPlane,
  finishProgramPartPointerSession,
  intersectRayWithDragPlaneMm,
  markProgramPartSessionDragged,
  pointerSessionShouldDrag,
  PROGRAM_PART_DRAG_THRESHOLD_PX,
} from './programPartPointerInteraction'

const baseTransform = {
  positionMm: [100, 0, 0] as [number, number, number],
  rotationDeg: [0, 0, 0] as [number, number, number],
}

describe('programPartPointerInteraction', () => {
  it('starts translate mode without shift', () => {
    const session = beginProgramPartPointerSession({
      partId: 'p1',
      shiftKey: false,
      pointerId: 1,
      clientX: 10,
      clientY: 20,
      transform: baseTransform,
      dragPlaneHitMm: [100, 0, 0],
    })
    expect(session.mode).toBe('translate')
  })

  it('starts rotate mode with shift at down', () => {
    const session = beginProgramPartPointerSession({
      partId: 'p1',
      shiftKey: true,
      pointerId: 1,
      clientX: 10,
      clientY: 20,
      transform: baseTransform,
    })
    expect(session.mode).toBe('rotate')
  })

  it('detects drag after threshold', () => {
    const session = beginProgramPartPointerSession({
      partId: 'p1',
      shiftKey: false,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      transform: baseTransform,
    })
    expect(pointerSessionShouldDrag(session, 0, 0)).toBe(false)
    expect(
      pointerSessionShouldDrag(session, PROGRAM_PART_DRAG_THRESHOLD_PX, 0),
    ).toBe(true)
  })

  it('computes translate from plane hit delta', () => {
    const session = beginProgramPartPointerSession({
      partId: 'p1',
      shiftKey: false,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      transform: baseTransform,
      dragPlaneHitMm: [100, 0, 0],
    })
    const next = computeTranslateTransform(session, [110, 5, 0])
    expect(next.positionMm).toEqual([110, 5, 0])
  })

  it('computes rotate from pointer delta', () => {
    const session = beginProgramPartPointerSession({
      partId: 'p1',
      shiftKey: true,
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      transform: baseTransform,
    })
    const next = computeRotateTransform(session, 110, 90)
    expect(next.rotationDeg[1]).toBeCloseTo(4)
    expect(next.rotationDeg[0]).toBeCloseTo(4)
  })

  it('finish returns click when not dragged', () => {
    const session = beginProgramPartPointerSession({
      partId: 'p1',
      shiftKey: false,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      transform: baseTransform,
    })
    expect(finishProgramPartPointerSession(session, baseTransform)).toEqual({ kind: 'click' })
  })

  it('finish returns drag when dragged', () => {
    let session = beginProgramPartPointerSession({
      partId: 'p1',
      shiftKey: false,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      transform: baseTransform,
    })
    session = markProgramPartSessionDragged(session)
    const moved = { ...baseTransform, positionMm: [120, 0, 0] as [number, number, number] }
    expect(finishProgramPartPointerSession(session, moved)).toEqual({
      kind: 'drag',
      transform: moved,
    })
  })

  it('second drag session starts from transform after first drag', () => {
    let session = beginProgramPartPointerSession({
      partId: 'p1',
      shiftKey: false,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      transform: baseTransform,
      dragPlaneHitMm: [100, 0, 0],
    })
    session = markProgramPartSessionDragged(session)
    const afterFirst = computeTranslateTransform(session, [130, 0, 0])
    const finish = finishProgramPartPointerSession(session, afterFirst)
    expect(finish.kind).toBe('drag')
    if (finish.kind !== 'drag') return

    const session2 = beginProgramPartPointerSession({
      partId: 'p1',
      shiftKey: false,
      pointerId: 2,
      clientX: 50,
      clientY: 50,
      transform: finish.transform,
      dragPlaneHitMm: [130, 0, 0],
    })
    expect(session2.startTransform.positionMm).toEqual([130, 0, 0])
    const afterSecond = computeTranslateTransform(session2, [140, 10, 0])
    expect(afterSecond.positionMm).toEqual([140, 10, 0])
  })

  it('intersects ray with drag plane', () => {
    const plane = createProgramPartDragPlane([0, 0, 0], new Vector3(0, 0, 1))
    const ray = new Ray(new Vector3(0, 0, 10), new Vector3(0, 0, -1))
    const hit = intersectRayWithDragPlaneMm(ray, plane)
    expect(hit).not.toBeNull()
    expect(hit![2]).toBeCloseTo(0)
  })
})
