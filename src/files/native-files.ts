import { registerPlugin } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { FileError, type ExportFile } from './project-files'
import type { DeliveryResult } from './file-delivery'

export const MAX_EXPORT_BYTES = 16 * 1024 * 1024
const NativeDocument = registerPlugin<{ save(options: { path: string; name: string; mime: string }): Promise<{ status: 'saved' | 'cancelled' }> }>('CuartosDocument')
interface NativeDependencies {
  fs: Pick<typeof Filesystem, 'writeFile' | 'readdir' | 'rmdir'>
  share: Pick<typeof Share, 'share'>
  document: typeof NativeDocument
  id: () => string
  now: () => number
}
const defaults: NativeDependencies = { fs: Filesystem, share: Share, document: NativeDocument, id: () => crypto.randomUUID(), now: Date.now }
const folder = 'cuartos-exports'
async function base64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return btoa(binary)
}
async function clearOld(deps: NativeDependencies) {
  try {
    const result = await deps.fs.readdir({ directory: Directory.Cache, path: folder })
    for (const entry of result.files) if (/^[A-Za-z0-9_-]+$/.test(entry.name) && entry.type === 'directory' && Number.isFinite(entry.mtime) && entry.mtime < deps.now() - 24 * 60 * 60 * 1000) {
      try { await deps.fs.rmdir({ directory: Directory.Cache, path: `${folder}/${entry.name}`, recursive: true }) } catch { /* Cleanup must not prevent a new export. */ }
    }
  } catch { /* A fresh installation has no export cache yet. */ }
}
export async function deliverNativeFile(file: ExportFile, mode: 'save' | 'share', title: string, dependencies: Partial<NativeDependencies> = {}): Promise<DeliveryResult> {
  const deps = { ...defaults, ...dependencies }
  if (!/^cuartos-[A-Za-z0-9_-]+\.(json|png)$/.test(file.name) || !(file.name.endsWith('.json') && file.blob.type === 'application/json' || file.name.endsWith('.png') && file.blob.type === 'image/png') || file.blob.size === 0 || file.blob.size > MAX_EXPORT_BYTES) throw new FileError('write')
  const id = deps.id()
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new FileError('write')
  await clearOld(deps)
  const path = `${folder}/${id}/${file.name}`
  try {
    const result = await deps.fs.writeFile({ directory: Directory.Cache, path, data: await base64(file.blob), recursive: true })
    if (mode === 'save') return (await deps.document.save({ path, name: file.name, mime: file.blob.type })).status
    if (!result.uri.startsWith('file://')) throw new FileError('write')
    try { await deps.share.share({ files: [result.uri], title, dialogTitle: title }); return 'shared' }
    catch (error) {
      // Capacitor's Android plugin reports chooser cancellation with this exact message.
      if (error instanceof Error && error.message === 'Share canceled') return 'cancelled'
      throw error
    }
  } catch { throw new FileError('write') }
}
