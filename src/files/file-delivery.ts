import { Capacitor } from '@capacitor/core'
import { FileError, type ExportFile } from './project-files'

export type DeliveryResult = 'saved' | 'download' | 'shared' | 'cancelled'
export function nativeFiles() { return Capacitor.getPlatform() === 'android' }
export async function deliverFile(file: ExportFile, mode: 'save' | 'share', title: string): Promise<DeliveryResult> {
  if (nativeFiles()) return (await import('./native-files')).deliverNativeFile(file, mode, title)
  if (mode !== 'save') throw new FileError('write')
  const url = URL.createObjectURL(file.blob), link = document.createElement('a')
  try {
    link.href = url; link.download = file.name; link.hidden = true; document.body.append(link); link.click()
    return 'download'
  } catch { throw new FileError('write') }
  finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000) }
}
