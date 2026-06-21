import { BufferGeometry, Float32BufferAttribute } from 'three'
import { describe, expect, it } from 'vitest'
import { defaultProgramPartTransform } from '../../pre-assembly/programParts/programPartTransform'
import { applyAssemblyMateConstraints } from '../applyAssemblyMateConstraints'
import { captureMateVertex } from '../captureMateVertex'
import { mateLineWorldFrame, parallelLinesDistance } from '../lineWorldFrame'
import { mateVertexWorldFrame } from '../vertexWorldFrame'
import { projectLineLine } from './projectLineLineCore'
import { projectVertexVertex, projectVertexLine } from './projectVertexPairs'
import { projectMateConstraint } from './projectMateConstraint'
import { normalizeParallelMate, type ParallelMate } from '../model'

describe('captureMateVertex', () => {
  it('captures vertex index from geometry', () => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute([1, 2, 3, 4, 5, 6], 3))
    const result = captureMateVertex('p1', geo, 1)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.vertex).toEqual({ kind: 'vertex', partId: 'p1', vertexIndex: 1 })
  })
})

describe('normalizeParallelMate', () => {
  it('migrates legacy planeA/planeB and parallelMode', () => {
    const normalized = normalizeParallelMate({
      id: 'm1',
      kind: 'parallel',
      parallelMode: 'line',
      planeA: { kind: 'line', partId: 'a', vertexA: 0, vertexB: 1 },
      planeB: { kind: 'line', partId: 'b', vertexA: 2, vertexB: 3 },
      alignment: 'faceToFace',
      offsetMm: 3,
    })
    expect(normalized.entityA).toEqual({ kind: 'line', partId: 'a', vertexA: 0, vertexB: 1 })
    expect(normalized.entityB).toEqual({ kind: 'line', partId: 'b', vertexA: 2, vertexB: 3 })
  })
})

describe('projectLineLine DOF', () => {
  function lineAlongX(length: number): BufferGeometry {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, length, 0, 0, 0, 1, 0], 3),
    )
    geo.computeBoundingBox()
    return geo
  }

  const lineA = { kind: 'line' as const, partId: 'a', vertexA: 0, vertexB: 1 }
  const lineB = { kind: 'line' as const, partId: 'b', vertexA: 0, vertexB: 1 }

  it('preserves twist around axis after anchor moves', () => {
    const geometryA = lineAlongX(10)
    const geometryB = lineAlongX(10)
    geometryB.translate(0, 5, 0)

    const initial = projectLineLine({
      lineA,
      lineB,
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: { positionMm: [0, 0, 0], rotationDeg: [0, 0, 45] },
      alignment: 'sameDirection',
      offsetMm: 5,
    })
    expect(initial.ok).toBe(true)
    if (!initial.ok) return

    const frameA0 = mateLineWorldFrame(geometryA, defaultProgramPartTransform(), lineA)
    const frameB0 = mateLineWorldFrame(geometryB, initial.transform, lineB)
    if (!frameA0 || !frameB0) throw new Error('missing frame')
    const offsetAlongA = frameB0.point.clone().sub(frameA0.point).dot(frameA0.direction.clone().normalize())

    const movedA = applyAssemblyMateConstraints({
      parts: [
        { id: 'a', ref: 'a.ecdprt', name: 'a', transform: defaultProgramPartTransform() },
        { id: 'b', ref: 'b.ecdprt', name: 'b', transform: initial.transform },
      ],
      mates: [{
        id: 'm1',
        kind: 'parallel',
        entityA: lineA,
        entityB: lineB,
        alignment: 'sameDirection',
        offsetMm: 5,
      } satisfies ParallelMate],
      geometries: { a: geometryA, b: geometryB },
      movedPartId: 'a',
      movedTransform: { positionMm: [20, 0, 0], rotationDeg: [0, 0, 0] },
    })
    const partB = movedA.find((p) => p.id === 'b')!
    const frameA1 = mateLineWorldFrame(geometryA, { positionMm: [20, 0, 0], rotationDeg: [0, 0, 0] }, lineA)
    const frameB1 = mateLineWorldFrame(geometryB, partB.transform, lineB)
    expect(parallelLinesDistance(frameA1, frameB1)).toBeCloseTo(5, 2)
    const offsetAfter = frameB1.point.clone().sub(frameA1.point).dot(frameA1.direction.clone().normalize())
    expect(offsetAfter).toBeCloseTo(offsetAlongA, 2)
  })

  it('sets perpendicular distance when offset is not along lineOffsetAxis', () => {
    const geometryA = lineAlongX(10)
    const geometryB = lineAlongX(10)
    geometryB.translate(0, 0, 7)

    const result = projectLineLine({
      lineA,
      lineB,
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      alignment: 'sameDirection',
      offsetMm: 3,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const frameA = mateLineWorldFrame(geometryA, defaultProgramPartTransform(), lineA)
    const frameB = mateLineWorldFrame(geometryB, result.transform, lineB)
    if (!frameA || !frameB) throw new Error('missing frame')
    expect(parallelLinesDistance(frameA, frameB)).toBeCloseTo(3, 2)
    expect(frameB.direction.dot(frameA.direction)).toBeCloseTo(1, 2)
  })

  it('makes lines collinear when distance is zero', () => {
    const geometryA = lineAlongX(10)
    const geometryB = lineAlongX(10)
    geometryB.translate(0, 5, 3)

    const result = projectLineLine({
      lineA,
      lineB,
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: { positionMm: [40, -10, 20], rotationDeg: [0, 0, 0] },
      alignment: 'sameDirection',
      offsetMm: 0,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const frameA = mateLineWorldFrame(geometryA, defaultProgramPartTransform(), lineA)
    const frameB = mateLineWorldFrame(geometryB, result.transform, lineB)
    if (!frameA || !frameB) throw new Error('missing frame')
    expect(parallelLinesDistance(frameA, frameB)).toBeCloseTo(0, 2)
  })

  it('aligns opposite directions for faceToFace', () => {
    const geometryA = lineAlongX(10)
    const geometryB = lineAlongX(10)

    const result = projectLineLine({
      lineA,
      lineB,
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      alignment: 'faceToFace',
      offsetMm: 0,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const frameA = mateLineWorldFrame(geometryA, defaultProgramPartTransform(), lineA)
    const frameB = mateLineWorldFrame(geometryB, result.transform, lineB)
    if (!frameA || !frameB) throw new Error('missing frame')
    expect(frameB.direction.dot(frameA.direction)).toBeCloseTo(-1, 2)
  })
})

describe('projectMateConstraint dispatcher', () => {
  function lineAlongX(length: number): BufferGeometry {
    const geo = new BufferGeometry()
    geo.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, length, 0, 0, 0, 1, 0], 3),
    )
    geo.computeBoundingBox()
    return geo
  }

  it('routes line-line pairs to line projector', () => {
    const geometryA = lineAlongX(10)
    const geometryB = lineAlongX(10)
    geometryB.translate(0, 0, 4)

    const result = projectMateConstraint({
      entityA: { kind: 'line', partId: 'a', vertexA: 0, vertexB: 1 },
      entityB: { kind: 'line', partId: 'b', vertexA: 0, vertexB: 1 },
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      alignment: 'sameDirection',
      offsetMm: 2,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const frameA = mateLineWorldFrame(
      geometryA,
      defaultProgramPartTransform(),
      { kind: 'line', partId: 'a', vertexA: 0, vertexB: 1 },
    )
    const frameB = mateLineWorldFrame(
      geometryB,
      result.transform,
      { kind: 'line', partId: 'b', vertexA: 0, vertexB: 1 },
    )
    if (!frameA || !frameB) throw new Error('missing frame')
    expect(parallelLinesDistance(frameA, frameB)).toBeCloseTo(2, 2)
  })

  it('routes vertex-line mixed pairs', () => {
    const geometryA = new BufferGeometry()
    geometryA.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
    )
    geometryA.computeBoundingBox()

    const geometryB = lineAlongX(10)
    geometryB.translate(0, 5, 0)

    const result = projectMateConstraint({
      entityA: { kind: 'vertex', partId: 'a', vertexIndex: 0 },
      entityB: { kind: 'line', partId: 'b', vertexA: 0, vertexB: 1 },
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      offsetMm: 3,
      alignment: 'faceToFace',
    })
    expect(result.ok).toBe(true)
  })
})

describe('projectVertexLine direct', () => {
  it('projects vertex-line distance', () => {
    const geometryA = new BufferGeometry()
    geometryA.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
    )
    geometryA.computeBoundingBox()

    const geometryB = new BufferGeometry()
    geometryB.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 10, 0, 0, 0, 1, 0], 3),
    )
    geometryB.translate(0, 8, 0)
    geometryB.computeBoundingBox()

    const result = projectVertexLine({
      vertexA: { kind: 'vertex', partId: 'a', vertexIndex: 0 },
      lineB: { kind: 'line', partId: 'b', vertexA: 0, vertexB: 1 },
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      offsetMm: 3,
    })
    expect(result.ok).toBe(true)
  })
})

describe('projectVertexVertex', () => {
  function pointGeo(x: number, y: number, z: number): BufferGeometry {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute([x, y, z, x + 1, y, z, x, y + 1, z], 3))
    geo.computeBoundingBox()
    return geo
  }

  it('keeps direction when adjusting distance', () => {
    const vertexA = { kind: 'vertex' as const, partId: 'a', vertexIndex: 0 }
    const vertexB = { kind: 'vertex' as const, partId: 'b', vertexIndex: 0 }
    const geometryA = pointGeo(0, 0, 0)
    const geometryB = pointGeo(30, 40, 0)

    const result = projectVertexVertex({
      vertexA,
      vertexB,
      geometryA,
      geometryB,
      transformA: defaultProgramPartTransform(),
      transformB: defaultProgramPartTransform(),
      offsetMm: 10,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const frameA = mateVertexWorldFrame(geometryA, defaultProgramPartTransform(), vertexA)
    const frameB = mateVertexWorldFrame(geometryB, result.transform, vertexB)
    if (!frameA || !frameB) throw new Error('missing frame')
    expect(frameA.point.distanceTo(frameB.point)).toBeCloseTo(10, 2)
  })
})
