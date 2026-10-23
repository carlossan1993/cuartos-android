import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Opening, Project } from '../domain/types'
import { getWalls } from '../geometry/rooms'
import { fromMeters, type LengthUnit } from '../geometry/units'
import { saveOpeningChange } from '../projects/save-opening'
import { ProjectSaveError } from '../storage/project-repository'
import { convertMeasurementText } from '../projects/room-draft'
import { initialOpeningDraft, openingDimensionsLabel, validateOpeningDraft, type OpeningDraft, type OpeningErrors, type OpeningField } from './opening-draft'
import { WallMap } from './WallMap'

function saveErrorKey(error: unknown) { return error instanceof ProjectSaveError ? `openings.saveErrors.${error.code}` : 'openings.saveErrors.failed' }

interface FormProps {
  project: Project; id: string; roomId: string; type: Opening['type']; existing?: Opening
  onBusy: (busy: boolean) => void; onPreviewWall: (id: string | null) => void
  onCancel: () => void; onSaved: (opening: Opening) => void
}
function OpeningForm({ project, id, roomId, type, existing, onBusy, onPreviewWall, onCancel, onSaved }: FormProps) {
  const { t, i18n } = useTranslation()
  const [draft, setDraft] = useState<OpeningDraft>(() => initialOpeningDraft(project, roomId, type, existing))
  const [errors, setErrors] = useState<OpeningErrors>({}), [issue, setIssue] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const pending = useRef(false), heading = useRef<HTMLHeadingElement>(null), form = useRef<HTMLFormElement>(null)
  const room = project.rooms.find(r => r.id === draft.roomId), walls = room ? getWalls(room) : [], wall = walls.find(w => w.id === draft.wallId)
  const format = (n: number) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 4 }).format(n)
  useEffect(() => { heading.current?.focus() }, [])
  useEffect(() => { onPreviewWall(draft.wallId); return () => onPreviewWall(null) }, [draft.wallId, onPreviewWall])

  function field(field: OpeningField) {
    return <div className="form-field" key={field}><label htmlFor={`opening-${field}`}>{t(`openings.${field}`)}<span className="field-unit">{draft.unit}</span></label>
      <input id={`opening-${field}`} type="text" inputMode="decimal" autoComplete="off" maxLength={32} value={draft[field]} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `opening-${field}-error` : 'opening-measure-help'} onChange={e => { setDraft(d => ({ ...d, [field]: e.target.value })); setErrors(current => ({ ...current, [field]: undefined })); setIssue(null) }} />
      {errors[field] && <p id={`opening-${field}-error`} className="field-error" role="alert">{t(`openings.errors.${errors[field]}`)}</p>}</div>
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending.current) return
    const result = validateOpeningDraft(draft, project, id, !!existing)
    setErrors(result.errors); setIssue(result.issue ? `openings.errors.${result.issue}` : null)
    if (!result.opening) { const first = Object.keys(result.errors)[0]; if (first) form.current?.querySelector<HTMLElement>(`#opening-${first}`)?.focus(); return }
    pending.current = true; setSaving(true); onBusy(true)
    try { await saveOpeningChange({ type: existing ? 'update' : 'add', opening: result.opening }); onSaved(result.opening) }
    catch (error) { setIssue(saveErrorKey(error)) }
    finally { pending.current = false; setSaving(false); onBusy(false) }
  }
  function unit(unit: LengthUnit) {
    setDraft(current => ({ ...current, unit, offset: convertMeasurementText(current.offset, current.unit, unit), width: convertMeasurementText(current.width, current.unit, unit), height: convertMeasurementText(current.height, current.unit, unit), sillHeight: convertMeasurementText(current.sillHeight, current.unit, unit) }))
  }
  return <section className="opening-form-panel" aria-labelledby="opening-form-title">
    <h2 ref={heading} tabIndex={-1} id="opening-form-title">{t(existing ? 'openings.editTitle' : 'openings.addTitle')}</h2>
    <p className="form-help">{t('openings.formHelp')}</p>
    <form ref={form} noValidate onSubmit={e => { void submit(e) }} aria-busy={saving}>
      <fieldset disabled={saving} className="wizard-fields"><legend className="sr-only">{t('openings.properties')}</legend>
        <div className="opening-form-grid"><div>
          <div className="opening-selects"><div className="form-field"><label htmlFor="opening-type">{t('openings.type')}</label><select id="opening-type" value={draft.type} onChange={e => { const type = e.target.value as Opening['type']; setDraft(d => ({ ...d, type, sillHeight: type === 'door' ? '0' : d.sillHeight })); setErrors({}); setIssue(null) }}><option value="door">{t('openings.door')}</option><option value="window">{t('openings.window')}</option></select></div>
          <div className="form-field"><label htmlFor="opening-roomId">{t('openings.roomId')}</label><select id="opening-roomId" value={draft.roomId} onChange={e => { const roomId = e.target.value, nextRoom = project.rooms.find(r => r.id === roomId); setDraft(d => ({ ...d, roomId, wallId: nextRoom ? getWalls(nextRoom)[0].id : '' })); setErrors({}); setIssue(null) }}>{project.rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></div></div>
          <div className="form-field"><label htmlFor="opening-wallId">{t('openings.wallId')}</label><select id="opening-wallId" value={draft.wallId} aria-invalid={!!errors.wallId} onChange={e => { setDraft(d => ({ ...d, wallId: e.target.value })); setErrors({}); setIssue(null) }}>{walls.map((wall, i) => <option key={wall.id} value={wall.id}>{t('openings.wallOption', { number: i + 1, length: format(fromMeters(wall.length, draft.unit)), unit: draft.unit })}</option>)}</select>{errors.wallId && <p className="field-error" role="alert">{t('openings.errors.choose')}</p>}</div>
          {room && <WallMap room={room} wallId={draft.wallId} />}
        </div><div>
          <div className="form-field"><label htmlFor="opening-unit">{t('wizard.unit')}</label><select id="opening-unit" value={draft.unit} onChange={e => unit(e.target.value as LengthUnit)}><option value="m">{t('wizard.units.m')}</option><option value="cm">{t('wizard.units.cm')}</option></select></div>
          <div className="opening-measures">{field('offset')}{field('width')}{field('height')}{draft.type === 'window' && field('sillHeight')}</div>
          <p id="opening-measure-help" className="form-help">{t('openings.positionHelp')}{wall && room && ` ${t('openings.available', { length: format(fromMeters(wall.length, draft.unit)), height: format(fromMeters(room.height, draft.unit)), unit: draft.unit })}`}</p>
        </div></div>
      </fieldset>
      {issue && <p className="error-notice" role="alert">{t(issue)}</p>}
      <div className="form-actions"><button type="button" className="button button-quiet" disabled={saving} onClick={onCancel}>{t('common.cancel')}</button><button type="submit" className="button button-primary" disabled={saving}>{t(saving ? 'wizard.saving' : 'openings.save')}</button></div>
    </form>
  </section>
}

export function OpeningTools({ project, roomId, selectedId, onSelect, onBusy, onPreviewWall, disabled = false, onEditingChange }: {
  project: Project; roomId: string | null; selectedId: string | null; disabled?: boolean; onEditingChange: (editing: boolean) => void
  onSelect: (id: string | null, roomId?: string) => void; onBusy: (busy: boolean) => void; onPreviewWall: (id: string | null) => void
}) {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState<{ id: string; type: Opening['type']; existing?: Opening } | null>(null)
  const [deleting, setDeleting] = useState(false), [message, setMessage] = useState<string | null>(null), pending = useRef(false)
  const editing = !!form
  useEffect(() => { onEditingChange(editing); return () => onEditingChange(false) }, [editing, onEditingChange])
  const selected = project.openings.find(o => o.id === selectedId)
  const format = (n: number) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 4 }).format(n)
  function add(type: Opening['type']) { setMessage(null); setForm({ id: crypto.randomUUID(), type }) }
  async function remove() {
    if (!selected || pending.current) return
    pending.current = true; setDeleting(true); onBusy(true); setMessage(null)
    try { await saveOpeningChange({ type: 'remove', id: selected.id }); onSelect(null); setMessage('openings.saved') }
    catch (error) { setMessage(saveErrorKey(error)) }
    finally { pending.current = false; setDeleting(false); onBusy(false) }
  }
  return <section className="opening-tools" aria-labelledby="opening-tools-title"><div className="opening-tools-heading"><h2 id="opening-tools-title">{t('openings.title')}</h2><div className="action-group"><button className="button button-secondary" type="button" disabled={disabled || !!form || deleting} onClick={() => add('door')}>{t('openings.addDoor')}</button><button className="button button-secondary" type="button" disabled={disabled || !!form || deleting} onClick={() => add('window')}>{t('openings.addWindow')}</button></div></div>
    {project.openings.length ? <ul className="opening-list">{project.openings.map((opening, i) => {
      const room = project.rooms.find(r => r.id === opening.roomId)!, wallNumber = getWalls(room).findIndex(w => w.id === opening.wallId) + 1
      return <li key={opening.id}><button type="button" disabled={disabled || !!form || deleting} aria-pressed={opening.id === selectedId} onClick={() => onSelect(opening.id, opening.roomId)}><strong>{t('openings.item', { type: t(`openings.${opening.type}`), number: i + 1 })}</strong><span>{room.name} · {t('openings.wallMarker', { number: wallNumber })} · {openingDimensionsLabel(opening, format)}</span></button></li>
    })}</ul> : <p className="form-help">{t('openings.empty')}</p>}
    {selected && !form && <div className="opening-selected"><p>{t('openings.selectedInfo', { offset: format(selected.offset), sill: format(selected.sillHeight) })}</p><div className="action-group"><button className="button button-secondary" type="button" disabled={disabled || deleting} onClick={() => { setMessage(null); setForm({ id: selected.id, type: selected.type, existing: selected }) }}>{t('openings.edit')}</button><button className="button button-quiet danger-button" type="button" disabled={disabled || deleting} onClick={() => { void remove() }}>{t(deleting ? 'wizard.saving' : 'openings.remove')}</button></div></div>}
    {message && <p className={message === 'openings.saved' ? 'opening-saved' : 'error-notice'} role={message === 'openings.saved' ? 'status' : 'alert'}>{t(message)}</p>}
    {form && <OpeningForm key={form.id} project={project} id={form.id} type={form.type} roomId={roomId ?? project.rooms[0]?.id ?? ''} existing={form.existing} onBusy={onBusy} onPreviewWall={onPreviewWall} onCancel={() => setForm(null)} onSaved={opening => { setForm(null); onSelect(opening.id, opening.roomId); setMessage('openings.saved') }} />}
  </section>
}
