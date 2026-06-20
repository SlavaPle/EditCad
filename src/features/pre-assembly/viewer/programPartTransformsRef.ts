import { useCallback, useEffect, useRef, useState } from 'react'
import type { PhantomTransform } from '../model'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import {
  applyProgramPartTransformsFromParts,
  cloneProgramPartTransform,
} from './programPartTransformsSync'

/** Ostatni znany transform detali — baza dla kolejnego drag/obrotu. */
export function useProgramPartTransformsRef(parts: readonly PreAssemblyProgramPart[]) {
  const transformsRef = useRef<Map<string, PhantomTransform>>(new Map())
  const [partsSyncTick, setPartsSyncTick] = useState(0)

  useEffect(() => {
    applyProgramPartTransformsFromParts(parts, transformsRef.current)
    setPartsSyncTick((tick) => tick + 1)
  }, [parts])

  const getTransform = useCallback((partId: string, fallback: PhantomTransform): PhantomTransform => {
    return transformsRef.current.get(partId) ?? cloneProgramPartTransform(fallback)
  }, [partsSyncTick])

  const setTransform = useCallback((partId: string, transform: PhantomTransform) => {
    transformsRef.current.set(partId, cloneProgramPartTransform(transform))
  }, [])

  return { getTransform, setTransform }
}
