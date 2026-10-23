import { useStore } from 'zustand'
import { projectStore } from '../state/project-store'
import { HistoryControls } from '../history/HistoryControls'
import { ConnectionSummary } from '../components/ConnectionSummary'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { FurnitureItem, Point, Project } from '../domain/types'
import { polygonArea } from '../geometry/rooms'
import { PlanDrawing } from './PlanDrawing'
import { FurnitureTools } from './FurnitureTools'
import { furnitureAtPoint } from '../furniture/geometry'
import { beginFurnitureDrag, moveFurnitureDrag, type FurnitureDrag } from '../furniture/drag'
import { saveProjectChange } from '../projects/save-project-change'
import { restoredZoom } from '../projects/view-preferences'
import { saveFurnitureChange, type FurnitureChange } from '../projects/save-furniture'
import { DomainError } from '../domain/errors'
import { ProjectSaveError } from '../storage/project-repository'
import { FinishTools } from './FinishTools'
import { OpeningTools } from './OpeningTools'
import { beginGesture, emptyGesture, endGesture, moveGesture } from './gestures'
import { fitCamera, gridLines, openingAtPoint, panCamera, resizeCamera, roomAtPoint, roomBounds, scaleLimits, screenToWorld, zoomCamera, MAX_ZOOM, MIN_ZOOM, type Camera, type Size } from './viewport'
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


export default function Editor2D({ project, onBack, onOpen3D }: { project: Project; onBack: () => void; onOpen3D: () => void }) {
  const { t, i18n } = useTranslation()
  const bounds = useMemo(() => roomBounds(project.rooms), [project.rooms])
  const surface = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const sceneRef = useRef<Scene | null>(null)
  const gesture = useRef(emptyGesture)
  const [scene, setScene] = useState<Scene | null>(null)
  const [selectedId, select] = useState<string | null>(null)
  const [selectedOpening, selectOpening] = useState<string | null>(null)
  const [selectedFurniture, selectFurniture] = useState<string | null>(null)
  const [furniturePreview, setFurniturePreview] = useState<FurnitureItem | null>(null)
  const drag = useRef<FurnitureDrag | null>(null), furniturePending = useRef(false)
  const [notice, setNotice] = useState<{ key: string; error: boolean } | null>(null)
  const [retryFurniture, setRetryFurniture] = useState<FurnitureChange | null>(null)
  const [snap, setSnap] = useState(project.viewSettings.snap)
  const [previewWall, setPreviewWall] = useState<string | null>(null)
  const [tool, setTool] = useState<'openings' | 'finishes' | 'furniture' | null>(null)
  const openingEditing = useCallback((active: boolean) => setTool(current => active ? 'openings' : current === 'openings' ? null : current), [])
  const furnitureEditing = useCallback((active: boolean) => { setTool(current => active ? 'furniture' : current === 'furniture' ? null : current); if (active) { setNotice(null); setRetryFurniture(null) } }, [])
  const finishTarget = useCallback((roomId: string, wallId: string | null) => { select(roomId); selectOpening(null); selectFurniture(null); setPreviewWall(wallId) }, [])
  const closeFinish = useCallback(() => { setTool(null); setPreviewWall(null) }, [])
  const [localBusy, setBusy] = useState(false)
  const pending = useStore(projectStore, state => state.pending)
  const busy = localBusy || pending !== null
  const [grid, setGrid] = useState(project.viewSettings.grid)
  const initialZoom = useRef(restoredZoom(project.viewSettings.zoom2d))
  const [viewMessage, setViewMessage] = useState<string | null>(null)
  const dpr = usePixelRatio()
  const selected = project.rooms.find(room => room.id === selectedId)
  const selectedBounds = selected ? roomBounds([selected]) : null
  const format = (n: number, digits = 4) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: digits }).format(n)
  const publish = useCallback((next: Scene) => { sceneRef.current = next; setScene(next) }, [])

  function cancelDrag() { drag.current = null; setFurniturePreview(null) }
  function chooseFurniture(id: string | null) {
    selectFurniture(id); selectOpening(null)
    const item = project.furniture.find(item => item.id === id)
    if (item) select(item.roomId)
  }
  async function commitFurniture(change: FurnitureChange, retry = false): Promise<boolean> {
    if (furniturePending.current || busy) return false
    furniturePending.current = true; setBusy(true); setNotice(null); setRetryFurniture(null)
    try {
      const result = await saveFurnitureChange(change)
      selectFurniture(result.changedId); selectOpening(null)
      const item = result.project.furniture.find(item => item.id === result.changedId)
      if (item) select(item.roomId)
      setNotice({ key: 'openings.saved', error: false })
      return true
    } catch (error) {
      const key = error instanceof ProjectSaveError ? `openings.saveErrors.${error.code}` : error instanceof DomainError ? error.code === 'furniture_height' ? 'furniture.errors.height' : error.code === 'furniture_outside_room' ? 'furniture.errors.outside' : 'furniture.errors.invalid' : 'openings.saveErrors.failed'
      setNotice({ key, error: true })
      if (retry && !(error instanceof DomainError)) setRetryFurniture(change)
      return false
    } finally { furniturePending.current = false; setBusy(false) }
  }

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
        gesture.current = emptyGesture; cancelDrag()
        const fitted = fitCamera(bounds, size)
        publish({ size, camera: current ? resizeCamera(current.camera, current.size, size, bounds) : zoomCamera(fitted, { x: size.width / 2, y: size.height / 2 }, initialZoom.current, scaleLimits(bounds, size)) })
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
      event.preventDefault(); cancelDrag(); gesture.current = emptyGesture
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? current.size.height : 1)
      const factor = Math.exp(-Math.max(-300, Math.min(300, delta)) * 0.002)
      publish({ ...current, camera: zoomCamera(current.camera, localPoint(event.clientX, event.clientY, element, current.size), factor, scaleLimits(bounds, current.size)) })
    }
    const cancel = () => { gesture.current = emptyGesture; cancelDrag() }
    element.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('blur', cancel)
    return () => { element.removeEventListener('wheel', wheel); window.removeEventListener('blur', cancel) }
  }, [bounds, publish])

  async function rememberView() {
    const current = sceneRef.current
    if (!current || busy || tool || furniturePreview) return
    setBusy(true); setViewMessage(null)
    const zoom2d = restoredZoom(current.camera.scale / fitCamera(bounds, current.size).scale)
    try { await saveProjectChange(state => state.setViewSettings({ ...state.project!.viewSettings, grid, snap, zoom2d })); setViewMessage('projects.viewSaved') }
    catch { setViewMessage('projects.viewError') }
    finally { setBusy(false) }
  }

  function zoom(factor: number) {
    cancelDrag(); gesture.current = emptyGesture
    const current = sceneRef.current
    if (current) publish({ ...current, camera: zoomCamera(current.camera, { x: current.size.width / 2, y: current.size.height / 2 }, factor, scaleLimits(bounds, current.size)) })
  }
  function fit() {
    cancelDrag()
    const current = sceneRef.current
    if (current) { gesture.current = emptyGesture; publish({ ...current, camera: fitCamera(bounds, current.size) }) }
  }
  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0 || !sceneRef.current) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    const current = sceneRef.current, point = localPoint(event.clientX, event.clientY, event.currentTarget, current.size)
    const first = Object.keys(gesture.current.pointers).length === 0
    if (!first) cancelDrag()
    gesture.current = beginGesture(gesture.current, event.pointerId, point)
    if (first && !busy && !tool) {
      const id = furnitureAtPoint(screenToWorld(point, current.camera), project.furniture, 4 / current.camera.scale)
      const item = project.furniture.find(item => item.id === id)
      if (item) { chooseFurniture(item.id); drag.current = beginFurnitureDrag(event.pointerId, point, item, current.camera.scale, project.viewSettings.gridSize, snap); setFurniturePreview(item) }
    }
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = sceneRef.current
    if (!current || !gesture.current.pointers[event.pointerId]) return
    const point = localPoint(event.clientX, event.clientY, event.currentTarget, current.size)
    const next = moveGesture(gesture.current, event.pointerId, point, current.camera, scaleLimits(bounds, current.size))
    gesture.current = next.gesture
    if (drag.current?.pointerId === event.pointerId) { drag.current = moveFurnitureDrag(drag.current, point); setFurniturePreview(drag.current.candidate) }
    else if (next.camera !== current.camera) publish({ ...current, camera: next.camera })
  }
  function up(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    if (!cancelled) move(event)
    const active = drag.current?.pointerId === event.pointerId ? drag.current : null
    const next = endGesture(gesture.current, event.pointerId, cancelled || !!active?.moved)
    gesture.current = next.gesture
    if (active) {
      cancelDrag()
      if (!cancelled && active.moved && (active.candidate.position.x !== active.item.position.x || active.candidate.position.y !== active.item.position.y)) void commitFurniture({ type: 'update', item: active.candidate }, true)
      return
    }
    if (next.tap && sceneRef.current && !tool && !busy) {
      const furniture = furnitureAtPoint(screenToWorld(next.tap, sceneRef.current.camera), project.furniture, 4 / sceneRef.current.camera.scale)
      if (furniture) { chooseFurniture(furniture); return }
      selectFurniture(null)
      const id = openingAtPoint(next.tap, sceneRef.current.camera, project)
      selectOpening(id)
      select(id ? project.openings.find(opening => opening.id === id)!.roomId : roomAtPoint(next.tap, sceneRef.current.camera, project.rooms))
    }
  }

  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey) return
    const current = sceneRef.current
    if (!current) return
    if (drag.current) { cancelDrag(); gesture.current = emptyGesture; if (event.key === 'Escape') { event.preventDefault(); return } }
    if ((tool || busy) && (event.key === 'Enter' || event.key === 'Escape')) return
    const deltas: Record<string, Point> = { ArrowLeft: { x: 30, y: 0 }, ArrowRight: { x: -30, y: 0 }, ArrowUp: { x: 0, y: 30 }, ArrowDown: { x: 0, y: -30 } }
    if (deltas[event.key]) publish({ ...current, camera: panCamera(current.camera, deltas[event.key]) })
    else if (event.key === '+' || event.key === '=') zoom(1.25)
    else if (event.key === '-') zoom(0.8)
    else if (event.key === '0' || event.key === 'Home') fit()
    else if (event.key === 'Escape') { select(null); selectOpening(null); selectFurniture(null) }
    else if (event.key === 'Enter') { select(project.rooms[0]?.id ?? null); selectFurniture(null); selectOpening(null) }
    else return
    event.preventDefault()
  }
  const relativeZoom = scene ? scene.camera.scale / fitCamera(bounds, scene.size).scale : 1
  const step = scene ? gridLines(scene.camera, scene.size, project.viewSettings.gridSize).step : project.viewSettings.gridSize
  return <section className="editor-page" aria-labelledby="editor-title">
    <button type="button" className="button button-quiet back-link" disabled={busy || !!furniturePreview} onClick={onBack}>← {t('editor.back')}</button>
    <div className="editor-heading"><div><p className="eyebrow">{t('editor.eyebrow')}</p><h1 id="editor-title" ref={heading} tabIndex={-1}>{project.name}</h1></div><span className="editor-mode">2D</span></div>
    <HistoryControls disabled={!!tool || !!furniturePreview || localBusy || !!retryFurniture} onReload={() => { cancelDrag(); select(null); selectOpening(null); selectFurniture(null); setNotice(null); setRetryFurniture(null); setViewMessage(null) }} />
    <div className="editor-toolbar" role="group" aria-label={t('editor.tools')}>
      <div className="zoom-controls"><button type="button" className="button button-secondary icon-button" aria-label={t('editor.zoomOut')} disabled={!scene || relativeZoom <= MIN_ZOOM + 1e-8} onClick={() => zoom(0.8)}>−</button><output aria-label={t('editor.zoomLevel')}>{Math.round(relativeZoom * 100)}%</output><button type="button" className="button button-secondary icon-button" aria-label={t('editor.zoomIn')} disabled={!scene || relativeZoom >= MAX_ZOOM - 1e-8} onClick={() => zoom(1.25)}>+</button></div>
      <button type="button" className="button button-secondary" onClick={fit} disabled={!scene}>{t('editor.fit')}</button>
      <label className="editor-grid-toggle"><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} />{t('editor.grid')}</label>
      <label className="editor-grid-toggle"><input type="checkbox" checked={snap} disabled={!!furniturePreview || busy} onChange={event => setSnap(event.target.checked)} />{t('furniture.snap', { value: format(project.viewSettings.gridSize) })}</label>
      <button className="button button-secondary" type="button" disabled={busy || !!tool || !!furniturePreview || !scene} onClick={() => { void rememberView() }}>{t('projects.remember2d')}</button>
      <button className="button button-primary open-3d" type="button" disabled={busy || !!tool || !!furniturePreview} onClick={onOpen3D}>{t('viewer.open')}</button>
    </div>
    {notice && tool !== 'furniture' && <div className={notice.error ? 'error-notice furniture-feedback' : 'opening-saved furniture-feedback'} role={notice.error ? 'alert' : 'status'}><p>{t(notice.key)}</p>{retryFurniture && <><p>{t('furniture.retryHelp')}{retryFurniture.type === 'update' && ` ${t('furniture.selectedInfo', { x: format(retryFurniture.item.position.x), y: format(retryFurniture.item.position.y), rotation: format(retryFurniture.item.rotation) })}`}</p><div className="action-group"><button className="button button-secondary" disabled={busy} type="button" onClick={() => { void commitFurniture(retryFurniture, true) }}>{t('furniture.retry')}</button><button className="button button-quiet" disabled={busy} type="button" onClick={() => { setRetryFurniture(null); setNotice(null) }}>{t('common.cancel')}</button></div></>}</div>}
    {viewMessage && <p className="form-help" role="status">{t(viewMessage)}</p>}
    <ConnectionSummary rooms={project.rooms} /><p id="canvas-help" className="editor-help">{t('editor.help')} {t('furniture.canvasHelp')}</p><p id="canvas-keyboard" className="sr-only">{t('editor.keyboard')}</p>
    <div className="editor-workspace">
      <div className="plan-workspace"><div className="canvas-frame"><div ref={surface} className="canvas-surface" role="region" tabIndex={0} aria-label={t('editor.canvas')} aria-describedby="canvas-help canvas-keyboard"
        onPointerDown={down} onPointerMove={move} onPointerUp={event => up(event)} onPointerCancel={event => up(event, true)} onLostPointerCapture={event => up(event, true)} onKeyDown={key}>
        {scene && <PlanDrawing project={project} scene={scene} grid={grid} selected={selectedId} selectedOpening={selectedOpening} previewWall={previewWall} dpr={dpr} selectedFurniture={selectedFurniture} furniturePreview={furniturePreview} />}
      </div></div><p className="canvas-caption"><span>{grid ? t('editor.gridStep', { value: format(step) }) : t('editor.gridOff')}</span><span>{t('editor.metres')}</span></p></div>
      <aside className="editor-sidebar" aria-labelledby="editor-rooms"><h2 id="editor-rooms">{t('editor.rooms')}</h2>
        <ul className="editor-room-list">{project.rooms.map(room => <li key={room.id}><button type="button" aria-pressed={room.id === selectedId} disabled={busy || !!tool || !!furniturePreview} onClick={() => { select(room.id); selectOpening(null); selectFurniture(null) }}><span className="room-list-mark" aria-hidden="true" />{room.name}</button></li>)}</ul>
        <p className="editor-selection" role="status">{selected ? t('editor.selected') : t('editor.noSelection')}</p>
        {selected && selectedBounds && <dl className="room-measures selected-measures"><div><dt>{t('wizard.width')}</dt><dd>{format(selectedBounds.right - selectedBounds.left)} m</dd></div><div><dt>{t('wizard.depth')}</dt><dd>{format(selectedBounds.bottom - selectedBounds.top)} m</dd></div><div><dt>{t('wizard.height')}</dt><dd>{format(selected.height)} m</dd></div><div><dt>{t('room.area')}</dt><dd>{format(polygonArea(selected.polygon), 2)} m²</dd></div></dl>}
        {selected && <button className="button button-quiet clear-selection" type="button" disabled={busy || !!tool || !!furniturePreview} onClick={() => { select(null); selectOpening(null); selectFurniture(null) }}>{t('editor.clearSelection')}</button>}
      </aside>
    </div>
    <FurnitureTools project={project} roomId={selectedId} selectedId={selectedFurniture} onSelect={chooseFurniture} disabled={busy || !!furniturePreview || !!tool && tool !== 'furniture'} busy={busy} snap={snap} error={notice?.error ? notice.key : null} onCommit={commitFurniture} onEditingChange={furnitureEditing} />
    <FinishTools project={project} roomId={selectedId} active={tool === 'finishes'} disabled={busy || !!furniturePreview || !!tool && tool !== 'finishes'} onOpen={() => setTool('finishes')} onClose={closeFinish} onBusy={setBusy} onTarget={finishTarget} />
    <OpeningTools disabled={busy || !!furniturePreview || !!tool && tool !== 'openings'} onEditingChange={openingEditing} project={project} roomId={selectedId} selectedId={selectedOpening} onBusy={setBusy} onPreviewWall={setPreviewWall} onSelect={(id, roomId) => { selectFurniture(null); selectOpening(id); const owner = roomId ?? project.openings.find(o => o.id === id)?.roomId; if (owner) select(owner) }} />
  </section>
}
