import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type Konva from 'konva'
import type { Point, Project } from '../domain/types'
import { getWalls, polygonArea } from '../geometry/rooms'
import { openingGeometry } from '../geometry/openings'
import { OpeningTools } from './OpeningTools'
import { beginGesture, emptyGesture, endGesture, moveGesture } from './gestures'
import { fitCamera, gridLines, openingAtPoint, panCamera, resizeCamera, roomAtPoint, roomBounds, scaleLimits, worldToScreen, zoomCamera, MAX_ZOOM, MIN_ZOOM, type Camera, type Size } from './viewport'
import './editor.css'

interface Scene { size: Size; camera: Camera }
function localPoint(clientX: number, clientY: number, element: HTMLElement, size: Size): Point {
  const rect = element.getBoundingClientRect()
  return { x: (clientX - rect.left) * size.width / rect.width, y: (clientY - rect.top) * size.height / rect.height }
}
function readDpr() { return Math.min(3, Math.max(1, window.devicePixelRatio || 1)) }
function usePixelRatio() {
  const [ratio, setRatio] = useState(readDpr)
  useEffect(() => {
    let query: MediaQueryList
    const update = () => {
      setRatio(readDpr())
      query?.removeEventListener('change', update)
      query = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      query.addEventListener('change', update)
    }
    query = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    query.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => { query.removeEventListener('change', update); window.removeEventListener('resize', update) }
  }, [])
  return ratio
}

function PlanDrawing({ project, scene, grid, selected, selectedOpening, previewWall, dpr }: { project: Project; scene: Scene; grid: boolean; selected: string | null; selectedOpening: string | null; previewWall: string | null; dpr: number }) {
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
  return <div aria-hidden="true" className="konva-drawing"><Stage width={size.width} height={size.height} listening={false}>
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
        const width = b.x - a.x, height = b.y - a.y, center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        return <Group key={room.id} listening={false}>
          <Line points={points.flatMap(p => [p.x, p.y])} closed fill={active ? '#e7e7fb' : room.floorMaterial.color} stroke="#03038c" strokeWidth={active ? 4 : 2.5} lineJoin="round" perfectDrawEnabled={false} />
          {getWalls(room).map((wall, i) => {
            const a = worldToScreen(wall.start, camera), b = worldToScreen(wall.end, camera), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
            const dx = center.x - mid.x, dy = center.y - mid.y, distance = Math.max(1, Math.hypot(dx, dy))
            return <Group key={wall.id}>{wall.id === previewWall && <Line points={[a.x, a.y, b.x, b.y]} stroke="#ad5728" strokeWidth={3} dash={[6, 4]} />}<Text x={mid.x + dx / distance * 16 - 15} y={mid.y + dy / distance * 16 - 5} width={30} align="center" text={t('openings.wallMarker', { number: i + 1 })} fontSize={10} fill={wall.id === previewWall ? '#ad5728' : '#626a80'} fontFamily="sans-serif" /></Group>
          })}
          {active && points.map((point, i) => <Circle key={room.polygon[i].id} x={point.x} y={point.y} radius={4} fill="white" stroke="#03038c" strokeWidth={1.5} />)}
          {width > 80 && height > 55 && <>
            <Text x={a.x + 10} y={center.y - 17} width={Math.max(1, width - 20)} text={room.name} align="center" fontSize={13} fontFamily="sans-serif" fontStyle="bold" fill="#03038c" wrap="none" ellipsis />
            <Text x={a.x + 10} y={center.y + 6} width={Math.max(1, width - 20)} text={`${format(polygonArea(room.polygon), 2)} m²`} align="center" fontSize={12} fontFamily="sans-serif" fill="#5d6372" wrap="none" ellipsis />
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
        return <Group key={opening.id} listening={false}><Line points={[a.x, a.y, b.x, b.y]} stroke={room.id === selected ? '#e7e7fb' : room.floorMaterial.color} strokeWidth={7} />
          {opening.type === 'door' ? <><Line points={[a.x, a.y, leaf.x, leaf.y]} stroke={color} strokeWidth={active ? 3 : 2} /><Line points={geometry.arc.flatMap(point => { const p = worldToScreen(point, camera); return [p.x, p.y] })} stroke={color} strokeWidth={1.2} dash={[4, 3]} /></> : <>{[-3, 3].map(offset => <Line key={offset} points={[a.x + geometry.inward.x * offset, a.y + geometry.inward.y * offset, b.x + geometry.inward.x * offset, b.y + geometry.inward.y * offset]} stroke={color} strokeWidth={active ? 3 : 1.8} />)}</>}
          {active && <Circle x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} radius={4} fill="white" stroke={color} strokeWidth={2} />}
        </Group>
      })}
    </Layer>
  </Stage></div>
}

export default function Editor2D({ project, onBack }: { project: Project; onBack: () => void }) {
  const { t, i18n } = useTranslation()
  const bounds = useMemo(() => roomBounds(project.rooms), [project.rooms])
  const surface = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const sceneRef = useRef<Scene | null>(null)
  const gesture = useRef(emptyGesture)
  const [scene, setScene] = useState<Scene | null>(null)
  const [selectedId, select] = useState<string | null>(null)
  const [selectedOpening, selectOpening] = useState<string | null>(null)
  const [previewWall, setPreviewWall] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [grid, setGrid] = useState(project.viewSettings.grid)
  const dpr = usePixelRatio()
  const selected = project.rooms.find(room => room.id === selectedId)
  const selectedBounds = selected ? roomBounds([selected]) : null
  const format = (n: number, digits = 4) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: digits }).format(n)
  const publish = useCallback((next: Scene) => { sceneRef.current = next; setScene(next) }, [])

  useEffect(() => { heading.current?.focus() }, [project.id])
  useEffect(() => {
    const element = surface.current!
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect(), size = { width: Math.round(rect.width), height: Math.round(rect.height) }
        if (size.width <= 0 || size.height <= 0) return
        const current = sceneRef.current
        if (current && current.size.width === size.width && current.size.height === size.height) return
        gesture.current = emptyGesture
        publish({ size, camera: current ? resizeCamera(current.camera, current.size, size, bounds) : fitCamera(bounds, size) })
      })
    })
    observer.observe(element)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [bounds, publish])

  useEffect(() => {
    const element = surface.current!
    const wheel = (event: WheelEvent) => {
      const current = sceneRef.current
      if (!current) return
      event.preventDefault()
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? current.size.height : 1)
      const factor = Math.exp(-Math.max(-300, Math.min(300, delta)) * 0.002)
      publish({ ...current, camera: zoomCamera(current.camera, localPoint(event.clientX, event.clientY, element, current.size), factor, scaleLimits(bounds, current.size)) })
    }
    const cancel = () => { gesture.current = emptyGesture }
    element.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('blur', cancel)
    return () => { element.removeEventListener('wheel', wheel); window.removeEventListener('blur', cancel) }
  }, [bounds, publish])

  function zoom(factor: number) {
    const current = sceneRef.current
    if (current) publish({ ...current, camera: zoomCamera(current.camera, { x: current.size.width / 2, y: current.size.height / 2 }, factor, scaleLimits(bounds, current.size)) })
  }
  function fit() {
    const current = sceneRef.current
    if (current) { gesture.current = emptyGesture; publish({ ...current, camera: fitCamera(bounds, current.size) }) }
  }
  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0 || !sceneRef.current) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = beginGesture(gesture.current, event.pointerId, localPoint(event.clientX, event.clientY, event.currentTarget, sceneRef.current.size))
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = sceneRef.current
    if (!current || !gesture.current.pointers[event.pointerId]) return
    const next = moveGesture(gesture.current, event.pointerId, localPoint(event.clientX, event.clientY, event.currentTarget, current.size), current.camera, scaleLimits(bounds, current.size))
    gesture.current = next.gesture
    if (next.camera !== current.camera) publish({ ...current, camera: next.camera })
  }
  function up(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    if (!cancelled) move(event)
    const next = endGesture(gesture.current, event.pointerId, cancelled)
    gesture.current = next.gesture
    if (next.tap && sceneRef.current) {
      const id = openingAtPoint(next.tap, sceneRef.current.camera, project)
      selectOpening(id)
      select(id ? project.openings.find(opening => opening.id === id)!.roomId : roomAtPoint(next.tap, sceneRef.current.camera, project.rooms))
    }
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    const current = sceneRef.current
    if (!current) return
    const deltas: Record<string, Point> = { ArrowLeft: { x: 30, y: 0 }, ArrowRight: { x: -30, y: 0 }, ArrowUp: { x: 0, y: 30 }, ArrowDown: { x: 0, y: -30 } }
    if (deltas[event.key]) publish({ ...current, camera: panCamera(current.camera, deltas[event.key]) })
    else if (event.key === '+' || event.key === '=') zoom(1.25)
    else if (event.key === '-') zoom(0.8)
    else if (event.key === '0' || event.key === 'Home') fit()
    else if (event.key === 'Escape') { select(null); selectOpening(null) }
    else if (event.key === 'Enter') select(project.rooms[0]?.id ?? null)
    else return
    event.preventDefault()
  }
  const relativeZoom = scene ? scene.camera.scale / fitCamera(bounds, scene.size).scale : 1
  const step = scene ? gridLines(scene.camera, scene.size, project.viewSettings.gridSize).step : project.viewSettings.gridSize
  return <section className="editor-page" aria-labelledby="editor-title">
    <button type="button" className="button button-quiet back-link" disabled={busy} onClick={onBack}>← {t('editor.back')}</button>
    <div className="editor-heading"><div><p className="eyebrow">{t('editor.eyebrow')}</p><h1 id="editor-title" ref={heading} tabIndex={-1}>{project.name}</h1></div><span className="editor-mode">2D</span></div>
    <div className="editor-toolbar" role="group" aria-label={t('editor.tools')}>
      <div className="zoom-controls"><button type="button" className="button button-secondary icon-button" aria-label={t('editor.zoomOut')} disabled={!scene || relativeZoom <= MIN_ZOOM + 1e-8} onClick={() => zoom(0.8)}>−</button><output aria-label={t('editor.zoomLevel')}>{Math.round(relativeZoom * 100)}%</output><button type="button" className="button button-secondary icon-button" aria-label={t('editor.zoomIn')} disabled={!scene || relativeZoom >= MAX_ZOOM - 1e-8} onClick={() => zoom(1.25)}>+</button></div>
      <button type="button" className="button button-secondary" onClick={fit} disabled={!scene}>{t('editor.fit')}</button>
      <label className="editor-grid-toggle"><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} />{t('editor.grid')}</label>
    </div>
    <p id="canvas-help" className="editor-help">{t('editor.help')}</p><p id="canvas-keyboard" className="sr-only">{t('editor.keyboard')}</p>
    <div className="editor-workspace">
      <div className="plan-workspace"><div className="canvas-frame"><div ref={surface} className="canvas-surface" role="region" tabIndex={0} aria-label={t('editor.canvas')} aria-describedby="canvas-help canvas-keyboard"
        onPointerDown={down} onPointerMove={move} onPointerUp={event => up(event)} onPointerCancel={event => up(event, true)} onLostPointerCapture={event => up(event, true)} onKeyDown={key}>
        {scene && <PlanDrawing project={project} scene={scene} grid={grid} selected={selectedId} selectedOpening={selectedOpening} previewWall={previewWall} dpr={dpr} />}
      </div></div><p className="canvas-caption"><span>{grid ? t('editor.gridStep', { value: format(step) }) : t('editor.gridOff')}</span><span>{t('editor.metres')}</span></p></div>
      <aside className="editor-sidebar" aria-labelledby="editor-rooms"><h2 id="editor-rooms">{t('editor.rooms')}</h2>
        <ul className="editor-room-list">{project.rooms.map(room => <li key={room.id}><button type="button" aria-pressed={room.id === selectedId} onClick={() => { select(room.id); selectOpening(null) }}><span className="room-list-mark" aria-hidden="true" />{room.name}</button></li>)}</ul>
        <p className="editor-selection" role="status">{selected ? t('editor.selected') : t('editor.noSelection')}</p>
        {selected && selectedBounds && <dl className="room-measures selected-measures"><div><dt>{t('wizard.width')}</dt><dd>{format(selectedBounds.right - selectedBounds.left)} m</dd></div><div><dt>{t('wizard.depth')}</dt><dd>{format(selectedBounds.bottom - selectedBounds.top)} m</dd></div><div><dt>{t('wizard.height')}</dt><dd>{format(selected.height)} m</dd></div><div><dt>{t('room.area')}</dt><dd>{format(polygonArea(selected.polygon), 2)} m²</dd></div></dl>}
        {selected && <button className="button button-quiet clear-selection" type="button" onClick={() => { select(null); selectOpening(null) }}>{t('editor.clearSelection')}</button>}
      </aside>
    </div>
    <OpeningTools project={project} roomId={selectedId} selectedId={selectedOpening} onBusy={setBusy} onPreviewWall={setPreviewWall} onSelect={(id, roomId) => { selectOpening(id); const owner = roomId ?? project.openings.find(o => o.id === id)?.roomId; if (owner) select(owner) }} />
  </section>
}
