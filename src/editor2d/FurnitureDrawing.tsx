import { Ellipse, Group, Rect, Text } from 'react-konva'
import type { FurnitureItem } from '../domain/types'
import { catalogItem } from '../furniture/catalog'
import { furnitureSymbol } from '../furniture/symbol'
import { worldToScreen, type Camera } from './viewport'

export function FurnitureDrawing({ item, camera, selected, invalid, number }: { item: FurnitureItem; camera: Camera; selected: boolean; invalid?: boolean; number: number }) {
  const center = worldToScreen(item.position, camera), { width: w, depth: d } = item.dimensions
  const type = catalogItem(item.catalogId)?.renderer.type ?? 'unknown'
  return <Group x={center.x} y={center.y} rotation={item.rotation} scaleX={camera.scale} scaleY={camera.scale} listening={false}>
    {furnitureSymbol(type).map((part, i) => {
      const props = { fill: i === 0 ? item.materialOverrides.body?.color ?? part.fill : part.fill, stroke: '#3e4657', strokeWidth: .9, strokeScaleEnabled: false, perfectDrawEnabled: false }
      return part.shape === 'ellipse' ? <Ellipse key={i} {...props} x={(part.x + part.width / 2 - .5) * w} y={(part.y + part.height / 2 - .5) * d} radiusX={part.width * w / 2} radiusY={part.height * d / 2} /> : <Rect key={i} {...props} x={(part.x - .5) * w} y={(part.y - .5) * d} width={part.width * w} height={part.height * d} cornerRadius={.02} />
    })}
    {selected && <Rect x={-w / 2 - 4 / camera.scale} y={-d / 2 - 4 / camera.scale} width={w + 8 / camera.scale} height={d + 8 / camera.scale} stroke={invalid ? '#a43430' : '#03038c'} strokeWidth={2} strokeScaleEnabled={false} dash={[5 / camera.scale, 3 / camera.scale]} />}
    {Math.min(w, d) * camera.scale > 18 && <Group rotation={-item.rotation} scaleX={1 / camera.scale} scaleY={1 / camera.scale}><Rect x={-10} y={-10} width={20} height={20} fill={selected ? '#03038c' : '#ffffff'} opacity={.92} cornerRadius={5} /><Text x={-10} y={-6} width={20} align="center" text={String(number)} fontSize={11} fill={selected ? '#ffffff' : '#03038c'} /></Group>}
  </Group>
}
