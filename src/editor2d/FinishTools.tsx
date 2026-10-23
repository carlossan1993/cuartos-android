import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project, Room, SurfaceMaterial } from '../domain/types'
import { FINISH_PRESETS, parseFinishColor, patternKind, presetFor, sameMaterial } from '../finishes/catalog'
import type { FinishTarget } from '../finishes/changes'
import { getWalls } from '../geometry/rooms'
import { saveFinishChange } from '../projects/save-finish'
import { ProjectSaveError } from '../storage/project-repository'
import { WallMap } from './WallMap'

function materialAt(room: Room, surface: string): SurfaceMaterial {
  return surface === 'floor' ? room.floorMaterial : surface === 'allWalls' ? room.wallMaterials[getWalls(room)[0].id] : room.wallMaterials[surface]
}
function FinishForm({ project, initialRoomId, onClose, onBusy, onTarget, onSaved }: {
  project: Project; initialRoomId: string | null; onClose: () => void; onBusy: (busy: boolean) => void
  onTarget: (roomId: string, wallId: string | null) => void; onSaved: () => void
}) {
  const { t } = useTranslation()
  const [roomId, setRoomId] = useState(initialRoomId ?? project.rooms[0].id)
  const [surface, setSurface] = useState('floor')
  const room = project.rooms.find(room => room.id === roomId)!, walls = getWalls(room)
  const [draft, setDraft] = useState<SurfaceMaterial>(() => materialAt(room, 'floor'))
  const [color, setColor] = useState(draft.color), [colorError, setColorError] = useState(false)
  const [issue, setIssue] = useState<string | null>(null), [saving, setSaving] = useState(false)
  const pending = useRef(false), heading = useRef<HTMLHeadingElement>(null), colorInput = useRef<HTMLInputElement>(null)
  const current = materialAt(room, surface), kind = patternKind(draft), parsed = parseFinishColor(color)
  const mixed = surface === 'allWalls' && walls.some(wall => !sameMaterial(current, room.wallMaterials[wall.id]))
  useEffect(() => { heading.current?.focus() }, [])
  useEffect(() => { onTarget(roomId, surface === 'floor' || surface === 'allWalls' ? null : surface) }, [roomId, surface, onTarget])
  function load(nextRoom: Room, nextSurface: string) {
    const material = materialAt(nextRoom, nextSurface)
    setRoomId(nextRoom.id); setSurface(nextSurface); setDraft(material); setColor(material.color); setColorError(false); setIssue(null)
  }
  function choose(material: SurfaceMaterial) { setDraft(material); setColor(material.color); setColorError(false); setIssue(null) }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending.current) return
    if (!parsed) { setColorError(true); colorInput.current?.focus(); return }
    const target: FinishTarget = surface === 'floor' ? { kind: 'floor' } : surface === 'allWalls' ? { kind: 'allWalls' } : { kind: 'wall', wallId: surface }
    pending.current = true; setSaving(true); onBusy(true); setIssue(null)
    try { await saveFinishChange({ roomId, target, material: { ...draft, color: parsed } }); onSaved() }
    catch (error) { setIssue(error instanceof ProjectSaveError ? `openings.saveErrors.${error.code}` : 'openings.saveErrors.failed') }
    finally { pending.current = false; setSaving(false); onBusy(false) }
  }
  return <section className="finish-form" aria-labelledby="finish-form-title">
    <h3 id="finish-form-title" tabIndex={-1} ref={heading}>{t('finishes.editTitle')}</h3>
    <p className="form-help">{t('finishes.help')}</p>
    <form noValidate onSubmit={event => { void submit(event) }} aria-busy={saving}>
      <fieldset className="wizard-fields" disabled={saving}><legend className="sr-only">{t('finishes.properties')}</legend>
        <div className="finish-form-grid"><div>
          <div className="form-field"><label htmlFor="finish-room">{t('openings.roomId')}</label><select id="finish-room" value={roomId} onChange={event => load(project.rooms.find(room => room.id === event.target.value)!, 'floor')}>{project.rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></div>
          <div className="form-field"><label htmlFor="finish-surface">{t('finishes.surface')}</label><select id="finish-surface" value={surface} onChange={event => load(room, event.target.value)}><option value="floor">{t('finishes.floor')}</option><option value="allWalls">{t('finishes.allWalls')}</option>{walls.map((wall, i) => <option key={wall.id} value={wall.id}>{t('openings.wallMarker', { number: i + 1 })}</option>)}</select></div>
          {surface !== 'floor' && surface !== 'allWalls' && <WallMap room={room} wallId={surface} />}
          {surface === 'allWalls' && <p className="form-help">{t(mixed ? 'finishes.mixed' : 'finishes.allHelp')}</p>}
          <div className={`finish-preview pattern-${kind}`} style={{ backgroundColor: parsed ?? draft.color }} aria-hidden="true" />
          <p className="finish-preview-label">{t('finishes.preview')}</p>
          <div className="finish-color-row"><div className="form-field"><label htmlFor="finish-color">{t('finishes.color')}</label><input ref={colorInput} id="finish-color" type="text" autoComplete="off" spellCheck={false} maxLength={16} value={color} aria-invalid={colorError} aria-describedby={colorError ? 'finish-color-error' : 'finish-color-help'} onChange={event => { setColor(event.target.value); setColorError(false); setIssue(null) }} /></div><div className="form-field"><label htmlFor="finish-picker">{t('finishes.picker')}</label><input id="finish-picker" type="color" value={parsed ?? draft.color} onChange={event => choose({ ...draft, color: event.target.value })} /></div></div>
          {colorError && <p id="finish-color-error" className="field-error" role="alert">{t('finishes.colorError')}</p>}
          <p id="finish-color-help" className="form-help">{t('finishes.colorHelp')}</p>
          {surface === 'floor' && <div className="form-field"><label htmlFor="finish-pattern">{t('finishes.pattern')}</label><select id="finish-pattern" value={draft.textureId ?? ''} onChange={event => choose(event.target.value ? { color: parsed ?? draft.color, textureId: event.target.value } : { color: parsed ?? draft.color })}><option value="">{t('finishes.patterns.solid')}</option><option value="floor-planks">{t('finishes.patterns.planks')}</option><option value="floor-tiles">{t('finishes.patterns.tiles')}</option>{kind === 'unknown' && <option value={draft.textureId}>{t('finishes.patterns.unknown')}</option>}</select></div>}
          {kind === 'unknown' && <p className="form-help">{t('finishes.unknownHelp')}</p>}
        </div><div><h4>{t('finishes.library')}</h4><p className="form-help">{t('finishes.libraryHelp')}</p>
          <div className="finish-presets">{FINISH_PRESETS.filter(preset => surface === 'floor' || preset.surface === 'any').map(preset => <button key={preset.id} className="finish-preset" type="button" aria-pressed={!!parsed && sameMaterial({ ...draft, color: parsed }, preset.material)} onClick={() => choose(preset.material)}><span aria-hidden="true" className={`finish-swatch pattern-${patternKind(preset.material)}`} style={{ backgroundColor: preset.material.color }} /><span>{t(`finishes.presets.${preset.id}`)}</span></button>)}</div>
        </div></div>
      </fieldset>
      {issue && <p className="error-notice" role="alert">{t(issue)}</p>}
      <div className="form-actions"><button className="button button-quiet" type="button" disabled={saving} onClick={onClose}>{t('common.cancel')}</button><button className="button button-primary" type="submit" disabled={saving}>{t(saving ? 'wizard.saving' : 'finishes.save')}</button></div>
    </form>
  </section>
}
export function FinishTools({ project, roomId, active, disabled, onOpen, onClose, onBusy, onTarget }: {
  project: Project; roomId: string | null; active: boolean; disabled: boolean
  onOpen: () => void; onClose: () => void; onBusy: (busy: boolean) => void
  onTarget: (roomId: string, wallId: string | null) => void
}) {
  const { t } = useTranslation(), [saved, setSaved] = useState(false)
  const room = project.rooms.find(room => room.id === roomId) ?? project.rooms[0]
  if (!room) return null
  const surfaces = [{ id: 'floor', label: t('finishes.floor'), material: room.floorMaterial }, ...getWalls(room).map((wall, i) => ({ id: wall.id, label: t('openings.wallMarker', { number: i + 1 }), material: room.wallMaterials[wall.id] }))]
  return <section className="finish-tools" aria-labelledby="finish-tools-title"><div className="opening-tools-heading"><h2 id="finish-tools-title">{t('finishes.title')}</h2><button type="button" className="button button-secondary" disabled={disabled || active} onClick={() => { setSaved(false); onOpen() }}>{t('finishes.edit')}</button></div>
    {!active && <><p className="form-help">{room.name}</p><dl className="finish-summary">{surfaces.map(surface => { const preset = presetFor(surface.material); return <div key={surface.id}><dt>{surface.label}</dt><dd><span aria-hidden="true" className={`finish-summary-swatch pattern-${patternKind(surface.material)}`} style={{ backgroundColor: surface.material.color }} /><span>{preset ? t(`finishes.presets.${preset.id}`) : t('finishes.custom')}<small>{surface.material.color.toUpperCase()}</small></span></dd></div> })}</dl></>}
    {saved && <p className="opening-saved" role="status">{t('openings.saved')}</p>}
    {active && <FinishForm project={project} initialRoomId={roomId} onClose={onClose} onBusy={onBusy} onTarget={onTarget} onSaved={() => { onClose(); setSaved(true) }} />}
  </section>
}
