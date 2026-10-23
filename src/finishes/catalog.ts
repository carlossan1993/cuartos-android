import type { SurfaceMaterial } from '../domain/types'

export interface FinishPreset { readonly id: string; readonly material: SurfaceMaterial; readonly surface: 'any' | 'floor' }
export const FINISH_PRESETS: readonly FinishPreset[] = [
  { id: 'white', material: { color: '#ffffff' }, surface: 'any' },
  { id: 'chalk', material: { color: '#f2eee5' }, surface: 'any' },
  { id: 'sand', material: { color: '#d5bd96' }, surface: 'any' },
  { id: 'sage', material: { color: '#718571' }, surface: 'any' },
  { id: 'clay', material: { color: '#b65f43' }, surface: 'any' },
  { id: 'blue', material: { color: '#03038c' }, surface: 'any' },
  { id: 'slate', material: { color: '#536574' }, surface: 'any' },
  { id: 'charcoal', material: { color: '#30343b' }, surface: 'any' },
  { id: 'oak', material: { color: '#c39a68', textureId: 'floor-planks' }, surface: 'floor' },
  { id: 'walnut', material: { color: '#70503b', textureId: 'floor-planks' }, surface: 'floor' },
  { id: 'porcelain', material: { color: '#e2ddd3', textureId: 'floor-tiles' }, surface: 'floor' },
  { id: 'concrete', material: { color: '#a8aaa7' }, surface: 'floor' },
]
export function sameMaterial(a: SurfaceMaterial, b: SurfaceMaterial): boolean {
  return a.color.toLowerCase() === b.color.toLowerCase() && a.textureId === b.textureId
}
export function presetFor(material: SurfaceMaterial) { return FINISH_PRESETS.find(preset => sameMaterial(preset.material, material)) }
export function patternKind(material: SurfaceMaterial): 'solid' | 'planks' | 'tiles' | 'unknown' {
  if (!material.textureId) return 'solid'
  if (material.textureId === 'floor-planks') return 'planks'
  if (material.textureId === 'floor-tiles') return 'tiles'
  return 'unknown'
}
export function parseFinishColor(text: string): string | null {
  return /^#[0-9a-f]{6}$/i.test(text.trim()) ? text.trim().toLowerCase() : null
}
