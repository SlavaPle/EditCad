import {
  PRE_ASSEMBLY_FORMAT,
  PRE_ASSEMBLY_VERSION,
  type PhantomAssemblyFile,
} from '../model'
import type { AssemblyFile } from './assemblyModel'

/** Dokument fantomu osadzony w pliku złożenia (.ecdasm) — co najwyżej jeden. */
export function phantomDocFromAssemblyFile(file: AssemblyFile): PhantomAssemblyFile | null {
  if (!file.phantom) return null
  const phantom = file.phantom
  return {
    format: PRE_ASSEMBLY_FORMAT,
    version: PRE_ASSEMBLY_VERSION,
    id: phantom.id,
    name: phantom.name?.trim() || file.name,
    phantom,
  }
}
