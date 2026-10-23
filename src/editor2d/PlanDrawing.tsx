import { useEffect, useRef, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type Konva from 'konva'
import type { FurnitureItem, Project } from '../domain/types'
import { roomLabelCell, sharedWallSpans, visibleWallSpans, wallInward, wallPoint } from '../geometry/layout'
import { getWalls, polygonArea } from '../geometry/rooms'
import { openingGeometry } from '../geometry/openings'
import { furnitureFits } from '../furniture/geometry'
import { finishPattern } from '../finishes/pattern'
import { FurnitureDrawing } from './FurnitureDrawing'
import { gridLines, roomBounds, worldToScreen, type Camera, type Size } from './viewport'

export interface PlanScene { size: Size; camera: Camera }
export function PlanDrawing({ project, scene, grid, selected, selectedOpening, previewWall, dpr, selectedFurniture, furniturePreview, stageRef, exportTitle }: { stageRef?: Ref<Konva.Stage>; exportTitle?: string; selectedFurniture: string | null; furniturePreview: FurnitureItem | null; project: Project; scene: PlanScene; grid: boolean; selected: string | null; selectedOpening: string | null; previewWall: string | null; dpr: number }) {
  const { t, i18n } = useTranslation()
  const layer = useRef<Konva.Layer>(null)
  const { camera, size } = scene
  const format = (n: number, digits = 4) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: digits }).format(n)
  const lines = gridLines(camera, size, project.viewSettings.gridSize)
  useEffect(() => {
    // CSS pixels stay independent of device pixels. Update even when a window
    // moves between displays with different density; cap at 3 for memory.
    layer.current?.getCanvas().setPixelRatio(dpr)
    layer.current?.batchDraw()
  }, [dpr, size.width, size.height])
  return <div aria-hidden="true" className="konva-drawing"><Stage ref={stageRef} width={size.width} height={size.height} listening={false}>
    <Layer ref={layer} listening={false}>
      <Rect width={size.width} height={size.height} fill="#f9f9fc" listening={false} />
      {grid && <Group listening={false}>
        {lines.vertical.map((x, i) => <Line key={`x-${i}`} points={[x, 0, x, size.height]} stroke="#dddfea" strokeWidth={1} perfectDrawEnabled={false} />)}
        {lines.horizontal.map((y, i) => <Line key={`y-${i}`} points={[0, y, size.width, y]} stroke="#dddfea" strokeWidth={1} perfectDrawEnabled={false} />)}
      </Group>}
      {project.rooms.map(room => {
        const active = room.id === selected
        const points = room.polygon.map(point => worldToScreen(point, camera))
        const bounds = roomBounds([room])
        const a = worldToScreen({ x: bounds.left, y: bounds.top }, camera), b = worldToScreen({ x: bounds.right, y: bounds.bottom }, camera)
        const labelCell = roomLabelCell(room), labelA = worldToScreen({ x: labelCell.left, y: labelCell.top }, camera)
        const labelWidth = labelCell.width * camera.scale, labelHeight = labelCell.depth * camera.scale
        const width = b.x - a.x, height = b.y - a.y, center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        return <Group key={room.id} listening={false}>
          <Line points={points.flatMap(p => [p.x, p.y])} closed fill={room.floorMaterial.color} stroke="#586078" strokeWidth={1} lineJoin="round" perfectDrawEnabled={false} />
          <Group clipFunc={context => { context.beginPath(); points.forEach((point, i) => { if (i === 0) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y) }); context.closePath() }}>
            {finishPattern(room.floorMaterial, bounds, camera.scale).map(([a, b], i) => { const start = worldToScreen(a, camera), end = worldToScreen(b, camera); return <Line key={i} points={[start.x, start.y, end.x, end.y]} stroke="#263040" opacity={0.23} strokeWidth={1} /> })}
          </Group>
          {active && (project.rooms.length === 1 ? <Line points={points.flatMap(p => [p.x, p.y])} closed stroke="#03038c" strokeWidth={15} dash={[5, 4]} opacity={0.7} lineJoin="round" /> : <Group>{getWalls(room).flatMap(wall => [...visibleWallSpans(room, wall, project.rooms).map(span => ({ ...span, open: false })), ...sharedWallSpans(room, wall, project.rooms).map(span => ({ ...span, open: true }))].map((span, j) => { const a = worldToScreen(wallPoint(wall, span.start), camera), b = worldToScreen(wallPoint(wall, span.end), camera); return <Line key={`${wall.id}-${j}`} points={[a.x, a.y, b.x, b.y]} stroke="#03038c" strokeWidth={span.open ? 1 : 15} dash={span.open ? [3, 8] : [5, 4]} opacity={span.open ? .4 : .7} /> }))}</Group>)}
          {getWalls(room).map((wall, i) => {
            const spans = visibleWallSpans(room, wall, project.rooms)
            if (!spans.length) return null
            const longest = [...spans].sort((a, b) => b.end - b.start - (a.end - a.start))[0]
            const mid = worldToScreen(wallPoint(wall, (longest.start + longest.end) / 2), camera)
            const inward = wallInward(room, wall), dx = inward.x, dy = inward.y, distance = 1
            return <Group key={wall.id}>{spans.map((span, j) => {
              const a = worldToScreen(wallPoint(wall, span.start), camera), b = worldToScreen(wallPoint(wall, span.end), camera)
              return <Group key={j}><Line points={[a.x, a.y, b.x, b.y]} stroke="#596078" strokeWidth={10} lineCap="butt" /><Line points={[a.x, a.y, b.x, b.y]} stroke={room.wallMaterials[wall.id].color} strokeWidth={7} lineCap="butt" />{wall.id === previewWall && <Line points={[a.x, a.y, b.x, b.y]} stroke="#ad5728" strokeWidth={13} dash={[6, 4]} opacity={0.8} />}</Group>
            })}<Rect x={mid.x + dx / distance * 16 - 16} y={mid.y + dy / distance * 16 - 7} width={32} height={15} fill="#ffffff" opacity={0.9} cornerRadius={3} /><Text x={mid.x + dx / distance * 16 - 15} y={mid.y + dy / distance * 16 - 5} width={30} align="center" text={t('openings.wallMarker', { number: i + 1 })} fontSize={10} fill={wall.id === previewWall ? '#ad5728' : '#626a80'} fontFamily="sans-serif" /></Group>
          })}
          {active && points.map((point, i) => <Circle key={room.polygon[i].id} x={point.x} y={point.y} radius={4} fill="white" stroke="#03038c" strokeWidth={1.5} />)}
          {labelWidth > 80 && labelHeight > 55 && !project.furniture.some(item => item.roomId === room.id) && <>
            <Rect x={labelA.x + Math.max(5, labelWidth * .12)} y={labelA.y + labelHeight / 2 - 24} width={Math.max(1, labelWidth * .76)} height={50} fill="#ffffff" opacity={0.9} cornerRadius={5} />
            <Text x={labelA.x + 10} y={labelA.y + labelHeight / 2 - 17} width={Math.max(1, labelWidth - 20)} text={room.name} align="center" fontSize={13} fontFamily="sans-serif" fontStyle="bold" fill="#03038c" wrap="none" ellipsis />
            <Text x={labelA.x + 10} y={labelA.y + labelHeight / 2 + 6} width={Math.max(1, labelWidth - 20)} text={`${format(polygonArea(room.polygon), 2)} m²`} align="center" fontSize={12} fontFamily="sans-serif" fill="#5d6372" wrap="none" ellipsis />
          </>}
          {width > 35 && <Group>
            <Line points={[a.x, b.y + 16, a.x, b.y + 28, a.x, b.y + 22, b.x, b.y + 22, b.x, b.y + 16, b.x, b.y + 28]} stroke="#747b90" strokeWidth={1} />
            <Rect x={center.x - 44} y={b.y + 28} width={88} height={20} fill="#f9f9fc" cornerRadius={4} />
            <Text x={center.x - 44} y={b.y + 31} width={88} text={`${format(bounds.right - bounds.left)} m`} align="center" fontSize={12} fontFamily="sans-serif" fill="#03038c" />
          </Group>}
          {height > 35 && <Group>
            <Line points={[a.x - 16, a.y, a.x - 28, a.y, a.x - 22, a.y, a.x - 22, b.y, a.x - 16, b.y, a.x - 28, b.y]} stroke="#747b90" strokeWidth={1} />
            <Group x={a.x - 44} y={center.y + 44} rotation={-90}><Rect width={88} height={20} fill="#f9f9fc" cornerRadius={4} /><Text y={3} width={88} text={`${format(bounds.bottom - bounds.top)} m`} align="center" fontSize={12} fontFamily="sans-serif" fill="#03038c" /></Group>
          </Group>}
        </Group>
      })}
      {project.openings.map(opening => {
        const room = project.rooms.find(room => room.id === opening.roomId)!, geometry = openingGeometry(opening, room)
        const a = worldToScreen(geometry.start, camera), b = worldToScreen(geometry.end, camera), leaf = worldToScreen(geometry.leaf, camera)
        const active = opening.id === selectedOpening, color = active ? '#ad5728' : opening.type === 'door' ? '#03038c' : '#287d87'
        return <Group key={opening.id} listening={false}><Line points={[a.x, a.y, b.x, b.y]} stroke={room.floorMaterial.color} strokeWidth={16} />
          {opening.type === 'door' ? <><Line points={[a.x, a.y, leaf.x, leaf.y]} stroke="#ffffff" strokeWidth={active ? 5 : 4} /><Line points={geometry.arc.flatMap(point => { const p = worldToScreen(point, camera); return [p.x, p.y] })} stroke="#ffffff" strokeWidth={3.6} dash={[4, 3]} /><Line points={[a.x, a.y, leaf.x, leaf.y]} stroke={color} strokeWidth={active ? 3 : 2} /><Line points={geometry.arc.flatMap(point => { const p = worldToScreen(point, camera); return [p.x, p.y] })} stroke={color} strokeWidth={1.2} dash={[4, 3]} /></> : <>{[-3, 3].map(offset => <Group key={offset}><Line points={[a.x + geometry.inward.x * offset, a.y + geometry.inward.y * offset, b.x + geometry.inward.x * offset, b.y + geometry.inward.y * offset]} stroke="#ffffff" strokeWidth={active ? 5 : 4} /><Line points={[a.x + geometry.inward.x * offset, a.y + geometry.inward.y * offset, b.x + geometry.inward.x * offset, b.y + geometry.inward.y * offset]} stroke={color} strokeWidth={active ? 3 : 1.8} /></Group>)}</>}
          {active && <Circle x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} radius={4} fill="white" stroke={color} strokeWidth={2} />}
        </Group>
      })}
      {project.furniture.map((stored, i) => { const item = furniturePreview?.id === stored.id ? furniturePreview : stored, room = project.rooms.find(room => room.id === item.roomId)!; return <FurnitureDrawing key={item.id} item={item} camera={camera} selected={item.id === selectedFurniture} invalid={!!furniturePreview && !furnitureFits(item, room)} number={i + 1} /> })}
      {exportTitle && <><Text x={24} y={12} width={size.width - 48} text={exportTitle} fontFamily="sans-serif" fontSize={17} fontStyle="bold" fill="#03038c" wrap="none" ellipsis /><Text x={24} y={36} width={size.width - 48} text={project.rooms.map(room => `${room.name} · ${format(polygonArea(room.polygon), 2)} m²`).join('  |  ')} fontFamily="sans-serif" fontSize={12} fill="#626a80" wrap="none" ellipsis /><Text x={24} y={size.height - 26} text={t('editor.metres')} fontFamily="sans-serif" fontSize={11} fill="#626a80" /></>}
    </Layer>
  </Stage></div>
}
