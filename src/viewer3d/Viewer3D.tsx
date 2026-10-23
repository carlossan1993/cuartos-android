import { ConnectionSummary } from '../components/ConnectionSummary'
import { Component, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import type { FurnitureItem, Project } from '../domain/types'
import { visibleWallSpans } from '../geometry/layout'
import { getWalls, polygonArea } from '../geometry/rooms'
import { catalogItem } from '../furniture/catalog'
import { saveProjectChange } from '../projects/save-project-change'
import { Scene3D, type CameraReader, type CameraCommand, type CameraCommandKind } from './Scene3D'
import './viewer.css'

class RenderBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
function useDpr() {
  const read = () => Math.min(2, Math.max(1, window.devicePixelRatio || 1)), [dpr, setDpr] = useState(read)
  useEffect(() => {
    let query: MediaQueryList
    const update = () => { setDpr(read()); query?.removeEventListener('change', update); query = matchMedia(`(resolution: ${devicePixelRatio}dppx)`); query.addEventListener('change', update) }
    update(); window.addEventListener('resize', update)
    return () => { query.removeEventListener('change', update); window.removeEventListener('resize', update) }
  }, [])
  return dpr
}
function FurnitureInventory({ items, format }: { items: readonly FurnitureItem[]; format: (n: number) => string }) {
  const { t } = useTranslation()
  return <details className="viewer-inventory">
    <summary>{t('furniture.title')} ({items.length})</summary>
    {items.length ? <ul>{items.map(item => {
      const entry = catalogItem(item.catalogId)
      return <li key={item.id}>
        <strong>{entry ? t(entry.labelKey) : t('furniture.unknown')}</strong>
        <span>{format(item.dimensions.width)} × {format(item.dimensions.depth)} × {format(item.dimensions.height)} m</span>
        <span>{t('furniture.selectedInfo', { x: format(item.position.x), y: format(item.position.y), rotation: format(item.rotation) })}</span>
      </li>
    })}</ul> : <p>{t('furniture.empty')}</p>}
  </details>
}
export default function Viewer3D({ project, onBack }: { project: Project; onBack: () => void }) {
  const { t, i18n } = useTranslation(), heading = useRef<HTMLHeadingElement>(null)
  const [ready, setReady] = useState(false), [error, setError] = useState<'unavailable' | 'lost' | null>(null), [attempt, setAttempt] = useState(0)
  const [cutaway, setCutaway] = useState(true), [command, setCommand] = useState<CameraCommand>({ sequence: 0, kind: 'fit' })
  const capture = useRef<CameraReader | null>(null), [savingView, setSavingView] = useState(false), [viewMessage, setViewMessage] = useState<string | null>(null)
  const onCapture = useCallback((reader: CameraReader | null) => { capture.current = reader }, [])
  const dpr = useDpr(), format = (n: number) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 3 }).format(n)
  const onReady = useCallback(() => setReady(true), []), onLost = useCallback(() => { setReady(false); setError('lost') }, []), onError = useCallback(() => { setReady(false); setError('unavailable') }, [])
  useEffect(() => { heading.current?.focus() }, [])
  async function rememberView() {
    const camera3d = capture.current?.()
    if (!camera3d || savingView) return
    setSavingView(true); setViewMessage(null)
    try { await saveProjectChange(state => state.setViewSettings({ ...state.project!.viewSettings, camera3d })); setViewMessage('projects.viewSaved') }
    catch { setViewMessage('projects.viewError') }
    finally { setSavingView(false) }
  }
  function run(kind: CameraCommandKind) { setCommand(current => ({ sequence: current.sequence + 1, kind })) }
  function retry() { setReady(false); setError(null); setAttempt(n => n + 1) }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (!ready || error) return
    const commands: Record<string, CameraCommandKind> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', '+': 'zoomIn', '=': 'zoomIn', '-': 'zoomOut', Home: 'fit', '0': 'fit', t: 'top', w: 'panForward', s: 'panBack', a: 'panLeft', d: 'panRight' }
    if (commands[event.key]) { event.preventDefault(); run(commands[event.key]) }
  }
  const fallback = <div className="viewer-unavailable" role="alert"><h2>{t(`viewer.${error ?? 'unavailable'}`)}</h2><p>{t('viewer.recovery')}</p><button type="button" className="button button-primary" onClick={retry}>{t('common.retry')}</button><button type="button" className="button button-secondary" onClick={onBack}>{t('viewer.back')}</button></div>
  return <section className="viewer-page" aria-labelledby="viewer-title"><button type="button" className="button button-quiet back-link" disabled={savingView} onClick={onBack}>← {t('viewer.back')}</button><div className="viewer-heading"><div><p className="eyebrow">{t('viewer.eyebrow')}</p><h1 id="viewer-title" ref={heading} tabIndex={-1}>{project.name}</h1></div><span className="viewer-mode">3D</span></div>
    <div className="viewer-toolbar" role="group" aria-label={t('viewer.tools')}>
      {(['zoomOut', 'zoomIn', 'left', 'right', 'top', 'fit'] as const).map(kind => <button key={kind} type="button" className="button button-secondary" disabled={!ready || !!error || savingView} onClick={() => run(kind)}>{t(`viewer.${kind}`)}</button>)}
      <button type="button" className="button button-secondary" disabled={!ready || !!error || savingView} onClick={() => { void rememberView() }}>{t('projects.remember3d')}</button>
      <label className="viewer-toggle"><input type="checkbox" checked={cutaway} disabled={!ready || !!error || savingView} onChange={event => setCutaway(event.target.checked)} />{t('viewer.cutaway')}</label>
    </div>
    {viewMessage && <p className="form-help" role="status">{t(viewMessage)}</p>}
    <p id="viewer-help" className="viewer-help">{t('viewer.help')}</p><p id="viewer-keyboard" className="sr-only">{t('viewer.keyboard')}</p>
    <div className="viewer-workspace"><div className="viewer-canvas" role="region" tabIndex={0} aria-label={t('viewer.canvas')} aria-describedby="viewer-help viewer-keyboard" data-ready={ready && !error} onKeyDown={key}>
      {error ? fallback : <RenderBoundary key={attempt} fallback={fallback} onError={onError}><Canvas frameloop="demand" dpr={dpr} camera={{ fov: 40 }} shadows gl={{ antialias: true, powerPreference: 'low-power' }} fallback={<span>{t('viewer.unavailable')}</span>}><Scene3D onCapture={onCapture} project={project} cutaway={cutaway} command={command} onReady={onReady} onLost={onLost} /></Canvas></RenderBoundary>}
      {!ready && !error && <p className="viewer-loading" role="status">{t('viewer.loading')}</p>}
    </div><aside className="viewer-details" aria-labelledby="viewer-details-title"><h2 id="viewer-details-title">{t('viewer.details')}</h2>{project.rooms.map(room => <div key={room.id} className="viewer-room"><h3>{room.name}</h3><dl><div><dt>{t('room.area')}</dt><dd>{format(polygonArea(room.polygon))} m²</dd></div><div><dt>{t('wizard.height')}</dt><dd>{format(room.height)} m</dd></div><div><dt>{t('viewer.thickness')}</dt><dd>{format(room.wallThickness)} m</dd></div><div><dt>{t('viewer.openings')}</dt><dd>{project.openings.filter(opening => opening.roomId === room.id).length}</dd></div></dl><div className="viewer-materials"><span><i style={{ backgroundColor: room.floorMaterial.color }} />{t('finishes.floor')}</span>{getWalls(room).map((wall, i) => visibleWallSpans(room, wall, project.rooms).length ? <span key={wall.id}><i style={{ backgroundColor: room.wallMaterials[wall.id].color }} />{t('openings.wallMarker', { number: i + 1 })}</span> : null)}</div><FurnitureInventory items={project.furniture.filter(item => item.roomId === room.id)} format={format} /></div>)}<ConnectionSummary rooms={project.rooms} /><p>{t('viewer.scope')}</p></aside></div>
  </section>
}
