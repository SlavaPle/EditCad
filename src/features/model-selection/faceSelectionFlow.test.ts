import { describe, expect, it } from 'vitest'
import { createEmptySelection, selectFaces } from '../../lib/selection'
import { resolveFaceSelectionFlow } from './faceSelectionFlow'

describe('resolveFaceSelectionFlow', () => {
  it('sets base face and probable opposite on non-shift pick', () => {
    const result = resolveFaceSelectionFlow({
      currentSelection: createEmptySelection(),
      primaryFaces: [],
      pickedFaces: [6, 7],
      probableFromPick: [2, 3],
      probableFaces: [],
      shiftHeld: false,
    })

    expect(result.ignored).toBe(false)
    expect(result.nextSelection.faces.sort((a, b) => a - b)).toEqual([6, 7])
    expect(result.nextPrimaryFaces.sort((a, b) => a - b)).toEqual([6, 7])
    expect(result.nextProbableFaces.sort((a, b) => a - b)).toEqual([2, 3])
  })

  it('keeps base face and adds second face on shift pick', () => {
    const currentSelection = selectFaces(createEmptySelection(), [6, 7], 'replace')
    const result = resolveFaceSelectionFlow({
      currentSelection,
      primaryFaces: [6, 7],
      pickedFaces: [2, 3],
      probableFromPick: [6, 7],
      probableFaces: [2, 3],
      shiftHeld: true,
    })

    expect(result.ignored).toBe(false)
    expect(result.nextSelection.faces.sort((a, b) => a - b)).toEqual([2, 3, 6, 7])
    expect(result.nextPrimaryFaces.sort((a, b) => a - b)).toEqual([6, 7])
    expect(result.nextProbableFaces).toEqual([])
  })

  it('ignores shift pick when user clicks primary face again', () => {
    const currentSelection = selectFaces(createEmptySelection(), [6, 7], 'replace')
    const result = resolveFaceSelectionFlow({
      currentSelection,
      primaryFaces: [6, 7],
      pickedFaces: [7, 6],
      probableFromPick: [],
      probableFaces: [2, 3],
      shiftHeld: true,
    })

    expect(result.ignored).toBe(true)
    expect(result.nextSelection.faces.sort((a, b) => a - b)).toEqual([6, 7])
    expect(result.nextProbableFaces.sort((a, b) => a - b)).toEqual([2, 3])
  })
})
