import { describe, expect, it } from 'vitest'
import { createEmptySelection, selectFaces } from '../../lib/selection'
import { resolveFaceSelectionFlow } from './faceSelectionFlow'

describe('resolveFaceSelectionFlow', () => {
  it('selects only picked face on plain click', () => {
    const result = resolveFaceSelectionFlow({
      currentSelection: createEmptySelection(),
      primaryFaces: [],
      pickedFaces: [6, 7],
      probableFromPick: [2, 3],
      probableFaces: [],
      shiftHeld: false,
    })

    expect(result.ignored).toBe(false)
    expect([...result.nextSelection.faces].sort((a, b) => a - b)).toEqual([6, 7])
    expect([...result.nextPrimaryFaces].sort((a, b) => a - b)).toEqual([6, 7])
    expect(result.nextProbableFaces).toEqual([])
  })

  it('sets base face and probable opposite on shift pick', () => {
    const result = resolveFaceSelectionFlow({
      currentSelection: createEmptySelection(),
      primaryFaces: [],
      pickedFaces: [6, 7],
      probableFromPick: [2, 3],
      probableFaces: [],
      shiftHeld: true,
    })

    expect(result.ignored).toBe(false)
    expect([...result.nextSelection.faces].sort((a, b) => a - b)).toEqual([6, 7])
    expect([...result.nextPrimaryFaces].sort((a, b) => a - b)).toEqual([6, 7])
    expect([...result.nextProbableFaces].sort((a, b) => a - b)).toEqual([2, 3])
  })

  it('filters probable faces that overlap with picked primary set on shift pick', () => {
    const result = resolveFaceSelectionFlow({
      currentSelection: createEmptySelection(),
      primaryFaces: [],
      pickedFaces: [4, 5],
      probableFromPick: [5, 6, 7],
      probableFaces: [],
      shiftHeld: true,
    })

    expect(result.ignored).toBe(false)
    expect([...result.nextSelection.faces].sort((a, b) => a - b)).toEqual([4, 5])
    expect([...result.nextPrimaryFaces].sort((a, b) => a - b)).toEqual([4, 5])
    expect([...result.nextProbableFaces].sort((a, b) => a - b)).toEqual([6, 7])
  })

  it('replaces previous face selection on plain click', () => {
    const currentSelection = selectFaces(createEmptySelection(), [10, 11], 'replace')
    const result = resolveFaceSelectionFlow({
      currentSelection,
      primaryFaces: [10, 11],
      pickedFaces: [20, 21],
      probableFromPick: [30, 31],
      probableFaces: [30, 31],
      shiftHeld: false,
    })

    expect(result.ignored).toBe(false)
    expect([...result.nextSelection.faces].sort((a, b) => a - b)).toEqual([20, 21])
    expect([...result.nextPrimaryFaces].sort((a, b) => a - b)).toEqual([20, 21])
    expect(result.nextProbableFaces).toEqual([])
  })

  it('shift pick replaces previous selection and probable faces', () => {
    const currentSelection = selectFaces(createEmptySelection(), [10, 11], 'replace')
    const result = resolveFaceSelectionFlow({
      currentSelection,
      primaryFaces: [10, 11],
      pickedFaces: [20, 21],
      probableFromPick: [30, 31],
      probableFaces: [40, 41],
      shiftHeld: true,
    })

    expect(result.ignored).toBe(false)
    expect([...result.nextSelection.faces].sort((a, b) => a - b)).toEqual([20, 21])
    expect([...result.nextPrimaryFaces].sort((a, b) => a - b)).toEqual([20, 21])
    expect([...result.nextProbableFaces].sort((a, b) => a - b)).toEqual([30, 31])
  })
})
