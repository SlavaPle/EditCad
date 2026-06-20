import { validateAssemblyMate } from '../../assembly-mates/model'
import { isMvpSupportedEnvelope, parsePhantomAssembly, parsePhantomTransform } from '../codec'
import { normalizeAssemblyRelativeRef } from './assemblyRelativePath'
import { defaultProgramPartTransform } from '../programParts/programPartTransform'
import type { PhantomAssembly } from '../model'
import type { PhantomAssemblyFile } from '../model'
import type { PreAssemblyProgramPart } from '../preAssemblyProgram'
import {
  ASSEMBLY_FORMAT,
  ASSEMBLY_VERSION,
  type AssemblyFile,
  type ParseAssemblyFileResult,
} from './assemblyModel'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseProgramPart(value: unknown): PreAssemblyProgramPart | null {
  if (!isObject(value)) return null
  if (typeof value.id !== 'string' || value.id.trim().length === 0) return null
  if (typeof value.ref !== 'string' || value.ref.trim().length === 0) return null
  if (typeof value.name !== 'string' || value.name.trim().length === 0) return null
  const transform =
    value.transform === undefined
      ? defaultProgramPartTransform()
      : parsePhantomTransform(value.transform)
  if (!transform) return null
  return {
    id: value.id,
    ref: normalizeAssemblyRelativeRef(value.ref.trim()),
    name: value.name.trim(),
    transform,
  }
}

function parseProgram(value: unknown): PreAssemblyProgramPart[] | null {
  if (!Array.isArray(value)) return null
  const parts: PreAssemblyProgramPart[] = []
  const seenIds = new Set<string>()
  for (const entry of value) {
    const part = parseProgramPart(entry)
    if (!part) return null
    if (seenIds.has(part.id)) {
      return null
    }
    seenIds.add(part.id)
    parts.push(part)
  }
  return parts
}

function parseAssemblyMates(value: unknown): AssemblyFile['mates'] | 'invalid' {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return 'invalid'
  const mates: NonNullable<AssemblyFile['mates']> = []
  const seenIds = new Set<string>()
  for (const entry of value) {
    if (!validateAssemblyMate(entry)) return 'invalid'
    if (seenIds.has(entry.id)) return 'invalid'
    seenIds.add(entry.id)
    mates.push(entry)
  }
  return mates
}

function parseAssemblyPhantomField(value: unknown): PhantomAssembly | null | 'invalid' | 'multiple' {
  if (value === undefined) return null
  if (value === null) return null
  if (Array.isArray(value)) return 'multiple'
  const phantom = parsePhantomAssembly(value)
  if (!phantom) return 'invalid'
  if (!isMvpSupportedEnvelope(phantom.envelope)) {
    return 'invalid'
  }
  return phantom
}

export function parseAssemblyFile(content: string): ParseAssemblyFileResult {
  let raw: unknown
  try {
    raw = JSON.parse(content)
  } catch {
    return { ok: false, error: 'Assembly file is not valid JSON.' }
  }
  if (!isObject(raw)) {
    return { ok: false, error: 'Assembly file must be an object.' }
  }
  if (raw.format !== ASSEMBLY_FORMAT) {
    return { ok: false, error: 'Invalid assembly format identifier.' }
  }
  if (raw.version !== ASSEMBLY_VERSION) {
    return { ok: false, error: 'Unsupported assembly version.' }
  }
  if (typeof raw.id !== 'string' || raw.id.trim().length === 0) {
    return { ok: false, error: 'Assembly file id is required.' }
  }
  if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    return { ok: false, error: 'Assembly file name is required.' }
  }
  const program = parseProgram(raw.program)
  if (!program) {
    return { ok: false, error: 'Assembly program must be an array of valid parts.' }
  }
  if (raw.phantoms !== undefined) {
    return {
      ok: false,
      error: 'Assembly allows only one phantom; use the "phantom" field, not "phantoms".',
    }
  }
  const phantomParsed = parseAssemblyPhantomField(raw.phantom)
  if (phantomParsed === 'multiple') {
    return { ok: false, error: 'Assembly allows only one phantom.' }
  }
  if (phantomParsed === 'invalid') {
    return { ok: false, error: 'Invalid phantom in assembly file.' }
  }
  const matesParsed = parseAssemblyMates(raw.mates)
  if (matesParsed === 'invalid') {
    return { ok: false, error: 'Invalid mates in assembly file.' }
  }
  return {
    ok: true,
    file: {
      format: ASSEMBLY_FORMAT,
      version: ASSEMBLY_VERSION,
      id: raw.id,
      name: raw.name,
      program,
      ...(phantomParsed ? { phantom: phantomParsed } : {}),
      ...(matesParsed && matesParsed.length > 0 ? { mates: matesParsed } : {}),
    },
  }
}

export function serializeAssemblyFile(file: AssemblyFile): string {
  const payload: Record<string, unknown> = {
    format: file.format,
    version: file.version,
    id: file.id,
    name: file.name,
    program: file.program,
  }
  if (file.phantom) {
    payload.phantom = file.phantom
  }
  if (file.mates && file.mates.length > 0) {
    payload.mates = file.mates
  }
  return JSON.stringify(payload, null, 2)
}

export function createAssemblyFileFromProgram(
  program: readonly PreAssemblyProgramPart[],
  options?: {
    id?: string
    name?: string
    phantomDoc?: PhantomAssemblyFile | null
    mates?: AssemblyFile['mates']
  },
): AssemblyFile {
  const file: AssemblyFile = {
    format: ASSEMBLY_FORMAT,
    version: ASSEMBLY_VERSION,
    id: options?.id ?? 'assembly-root',
    name: options?.name ?? 'Assembly',
    program: program.map((part) => ({ ...part })),
  }
  if (options?.phantomDoc?.phantom) {
    file.phantom = structuredClone(options.phantomDoc.phantom)
  }
  if (options?.mates && options.mates.length > 0) {
    file.mates = options.mates.map((mate) => structuredClone(mate))
  }
  return file
}
