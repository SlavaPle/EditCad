import type { PhantomAssembly } from '../model'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'

export const ASSEMBLY_FORMAT = 'editcad.assembly' as const

export const ASSEMBLY_VERSION = 1 as const

export type AssemblyDocument = {
  id: string
  name: string
  program: PreAssemblyProgramPart[]
  /** Co najwyżej jeden fantom w złożeniu. */
  phantom?: PhantomAssembly
}

export type AssemblyFile = {
  format: typeof ASSEMBLY_FORMAT
  version: typeof ASSEMBLY_VERSION
  id: string
  name: string
  program: PreAssemblyProgramPart[]
  /** Co najwyżej jeden fantom w złożeniu. */
  phantom?: PhantomAssembly
}

export type ParseAssemblyFileResult =
  | { ok: true; file: AssemblyFile }
  | { ok: false; error: string }
