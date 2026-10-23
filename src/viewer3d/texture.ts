import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import type { SurfaceMaterial } from '../domain/types'
import { patternKind } from '../finishes/catalog'

export function floorTexture(material: SurfaceMaterial): CanvasTexture | null {
  const kind = patternKind(material)
  if (kind !== 'tiles' && kind !== 'planks') return null
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = material.color; ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#26304040'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(256, 0); ctx.moveTo(0, 0); ctx.lineTo(0, 256)
  if (kind === 'planks') { ctx.moveTo(0, 128); ctx.lineTo(256, 128); ctx.moveTo(128, 128); ctx.lineTo(128, 256) }
  ctx.stroke()
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace; texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(kind === 'tiles' ? 1 / .6 : 1 / 1.2, kind === 'tiles' ? 1 / .6 : 1 / .36)
  return texture
}
