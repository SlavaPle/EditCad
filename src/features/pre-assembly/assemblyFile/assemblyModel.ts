import type { PhantomAssembly } from '../model'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'

export const ASSEMBLY_FORMAT = 'editcad.assembly' as const

export const ASSEMBLY_VERSION = 1 as const

/**
 * Plik .ecdasm (JSON): program detali, fantom, powiązania.
 * - program[].ref — ścieżka do .ecdprt względem katalogu pliku .ecdasm
 * - program[].transform — położenie i obrót detalu na scenie
 * - phantom — geometria/opaska montażowa, sloty, connections między elementami
 */
export type AssemblyDocument = {
  id: string
  name: string
  program: PreAssemblyProgramPart[]
  /** Co najwyżej jeden fantom w złożeniu (elementy, connections, parametry). */
  phantom?: PhantomAssembly
}

export type AssemblyFile = {
  format: typeof ASSEMBLY_FORMAT
  version: typeof ASSEMBLY_VERSION
  id: string
  name: string
  program: PreAssemblyProgramPart[]
  phantom?: PhantomAssembly
}

export type ParseAssemblyFileResult =
  | { ok: true; file: AssemblyFile }
  | { ok: false; error: string }
