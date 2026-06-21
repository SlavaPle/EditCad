import { describe, expect, it, vi, beforeEach } from 'vitest'
import { pickAssemblyProjectDirectory } from './assemblyProjectIo'
import { persistAssemblyRootHandle, restoreAssemblyRootHandle } from './assemblyRootStore'
import {
  resolveAssemblyProjectDirectory,
  resolveAssemblyRootFromFileHandle,
} from './assemblyProjectDirectory'

vi.mock('./assemblyProjectIo', () => ({
  pickAssemblyProjectDirectory: vi.fn(),
}))

vi.mock('./assemblyRootStore', () => ({
  persistAssemblyRootHandle: vi.fn(),
  restoreAssemblyRootHandle: vi.fn(),
}))

const mockedPickDirectory = vi.mocked(pickAssemblyProjectDirectory)
const mockedPersistRoot = vi.mocked(persistAssemblyRootHandle)
const mockedRestoreRoot = vi.mocked(restoreAssemblyRootHandle)

describe('resolveAssemblyRootFromFileHandle', () => {
  it('returns parent directory when getParent is available', async () => {
    const parent = { name: 'project' } as FileSystemDirectoryHandle
    const fileHandle = {
      getParent: vi.fn().mockResolvedValue(parent),
    } as unknown as FileSystemFileHandle

    await expect(resolveAssemblyRootFromFileHandle(fileHandle)).resolves.toBe(parent)
  })

  it('returns null when getParent is missing', async () => {
    const fileHandle = { name: 'Assembly.ecdasm' } as FileSystemFileHandle
    await expect(resolveAssemblyRootFromFileHandle(fileHandle)).resolves.toBeNull()
  })
})

describe('resolveAssemblyProjectDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers current root from state', async () => {
    const root = { name: 'project' } as FileSystemDirectoryHandle
    await expect(
      resolveAssemblyProjectDirectory({
        assemblyId: 'asm-1',
        currentRoot: root,
      }),
    ).resolves.toBe(root)
    expect(mockedPersistRoot).toHaveBeenCalledWith('asm-1', root)
    expect(mockedRestoreRoot).not.toHaveBeenCalled()
  })

  it('restores root from IndexedDB', async () => {
    const stored = { name: 'stored' } as FileSystemDirectoryHandle
    mockedRestoreRoot.mockResolvedValue(stored)

    await expect(
      resolveAssemblyProjectDirectory({
        assemblyId: 'asm-2',
        currentRoot: null,
      }),
    ).resolves.toBe(stored)
    expect(mockedPersistRoot).toHaveBeenCalledWith('asm-2', stored)
  })

  it('prompts for directory when requested and nothing else works', async () => {
    mockedRestoreRoot.mockResolvedValue(null)
    const picked = { name: 'picked' } as FileSystemDirectoryHandle
    mockedPickDirectory.mockResolvedValue(picked)

    await expect(
      resolveAssemblyProjectDirectory({
        assemblyId: 'asm-3',
        currentRoot: null,
        promptIfMissing: true,
      }),
    ).resolves.toBe(picked)
    expect(mockedPickDirectory).toHaveBeenCalled()
    expect(mockedPersistRoot).toHaveBeenCalledWith('asm-3', picked)
  })
})
