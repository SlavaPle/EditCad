import { selectFaces, type SelectionState } from '../../lib/selection'

export type ResolveFaceSelectionInput = {
  currentSelection: SelectionState
  primaryFaces: readonly number[]
  pickedFaces: readonly number[]
  probableFromPick?: readonly number[]
  probableFaces: readonly number[]
  shiftHeld: boolean
}

export type ResolveFaceSelectionResult = {
  nextSelection: SelectionState
  nextPrimaryFaces: readonly number[]
  nextProbableFaces: readonly number[]
  ignored: boolean
}

function areFaceSetsEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false
  const setA = new Set(a)
  if (setA.size !== b.length) return false
  for (const fi of b) {
    if (!setA.has(fi)) return false
  }
  return true
}

export function resolveFaceSelectionFlow(input: ResolveFaceSelectionInput): ResolveFaceSelectionResult {
  const { currentSelection, primaryFaces, pickedFaces, probableFromPick = [], probableFaces, shiftHeld } = input

  if (!shiftHeld) {
    const nextSelection = selectFaces(currentSelection, pickedFaces, 'replace')
    const selectedSet = new Set(nextSelection.faces)
    const nextProbableFaces = probableFromPick.filter((fi) => !selectedSet.has(fi))
    return {
      nextSelection,
      nextPrimaryFaces: [...nextSelection.faces],
      nextProbableFaces,
      ignored: false,
    }
  }

  const lockedPrimary = primaryFaces.length > 0 ? primaryFaces : currentSelection.faces
  if (areFaceSetsEqual(lockedPrimary, pickedFaces)) {
    return {
      nextSelection: currentSelection,
      nextPrimaryFaces: primaryFaces,
      nextProbableFaces: probableFaces,
      ignored: true,
    }
  }

  const merged = [...lockedPrimary]
  const mergedSet = new Set(merged)
  for (const fi of pickedFaces) {
    if (mergedSet.has(fi)) continue
    merged.push(fi)
    mergedSet.add(fi)
  }

  return {
    nextSelection: selectFaces(currentSelection, merged, 'replace'),
    nextPrimaryFaces: primaryFaces,
    nextProbableFaces: [],
    ignored: false,
  }
}
