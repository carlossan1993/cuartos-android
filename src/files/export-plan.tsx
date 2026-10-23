import { createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import type Konva from 'konva'
import { cloneProject } from '../domain/project'
import type { Project } from '../domain/types'
import { PlanDrawing } from '../editor2d/PlanDrawing'
import { fileName, FileError, type ExportFile } from './project-files'
import { planLayout } from './plan-layout'

export async function pngFile(project: Project, width: number): Promise<ExportFile> {
  const snapshot = cloneProject(project), layout = planLayout(snapshot, width)
  const host = document.createElement('div'), stage = createRef<Konva.Stage>()
  host.setAttribute('aria-hidden', 'true')
  Object.assign(host.style, { position: 'fixed', left: '-10000px', top: '0', width: '1024px', height: '768px', pointerEvents: 'none' })
  document.body.append(host)
  const root = createRoot(host)
  let canvas: HTMLCanvasElement | null = null
  try {
    await document.fonts.ready
    flushSync(() => root.render(<PlanDrawing project={snapshot} scene={layout.scene} grid={snapshot.viewSettings.grid} selected={null} selectedOpening={null} selectedFurniture={null} furniturePreview={null} previewWall={null} dpr={1} stageRef={stage} exportTitle={snapshot.name} />))
    if (!stage.current) throw new FileError('image')
    canvas = stage.current.toCanvas({ pixelRatio: layout.pixelRatio })
    const blob = await new Promise<Blob>((resolve, reject) => canvas!.toBlob(value => value ? resolve(value) : reject(new FileError('image')), 'image/png'))
    return { name: fileName(snapshot.name, 'png'), blob }
  } catch { throw new FileError('image') }
  finally { flushSync(() => root.unmount()); host.remove(); if (canvas) { canvas.width = 0; canvas.height = 0 } }
}
