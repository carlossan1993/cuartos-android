import { ToolPanel } from '../components/ToolPanel'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { CatalogItem, FurnitureItem, Project } from '../domain/types'
import { catalogItem, FURNITURE_CATALOG } from '../furniture/catalog'
import { furnitureSymbol } from '../furniture/symbol'
import { convertPositionText, furnitureDraft, furnitureFromDraft } from '../furniture/draft'
import { normalizeRotation } from '../geometry/units'
import type { FurnitureChange } from '../projects/save-furniture'

function FurnitureThumbnail({ item }: { item: CatalogItem }) {
  const { width: w, depth: d } = item.dimensions
  return <svg viewBox={`-.1 -.1 ${w + .2} ${d + .2}`} className="furniture-thumbnail" aria-hidden="true">{furnitureSymbol(item.renderer.type).map((part, i) => part.shape === 'ellipse' ? <ellipse key={i} cx={(part.x + part.width / 2) * w} cy={(part.y + part.height / 2) * d} rx={part.width * w / 2} ry={part.height * d / 2} fill={part.fill} stroke="#3e4657" strokeWidth=".018" /> : <rect key={i} x={part.x * w} y={part.y * d} width={part.width * w} height={part.height * d} rx=".02" fill={part.fill} stroke="#3e4657" strokeWidth=".018" />)}</svg>
}
interface PanelProps { error: string | null; project: Project; busy: boolean; onClose: () => void; onCommit: (change: FurnitureChange) => Promise<boolean>; snap: boolean }
function CatalogPanel({ project, error, busy, onClose, onCommit, snap, initialRoomId }: PanelProps & { initialRoomId: string | null }) {
  const { t, i18n } = useTranslation(), heading = useRef<HTMLHeadingElement>(null), id = useRef(crypto.randomUUID())
  const [selected, setSelected] = useState('bed-single'), [roomId, setRoomId] = useState(initialRoomId ?? project.rooms[0].id), [category, setCategory] = useState('all')
  const format = (n: number) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 3 }).format(n)
  useEffect(() => { heading.current?.focus() }, [])
  async function submit(event: FormEvent) { event.preventDefault(); if (await onCommit({ type: 'add', id: id.current, catalogId: selected, roomId, snap })) onClose() }
  return <ToolPanel labelId="furniture-catalog-title" onClose={onClose} busy={busy} returnFocus=".furniture-tools .opening-tools-heading button"><section className="furniture-panel" aria-labelledby="furniture-catalog-title"><h3 id="furniture-catalog-title" tabIndex={-1} ref={heading}>{t('furniture.catalog')}</h3><p className="form-help">{t('furniture.catalogHelp')}</p>
    <form onSubmit={event => { void submit(event) }}><fieldset disabled={busy} className="wizard-fields"><legend className="sr-only">{t('furniture.catalog')}</legend>
      <div className="furniture-selects"><div className="form-field"><label htmlFor="furniture-room">{t('openings.roomId')}</label><select id="furniture-room" value={roomId} onChange={event => setRoomId(event.target.value)}>{project.rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></div><div className="form-field"><label htmlFor="furniture-category">{t('furniture.category')}</label><select id="furniture-category" value={category} onChange={event => { const category = event.target.value; setCategory(category); setSelected(FURNITURE_CATALOG.find(item => category === 'all' || item.categoryKey === category)!.catalogId) }}><option value="all">{t('furniture.allCategories')}</option>{Array.from(new Set(FURNITURE_CATALOG.map(item => item.categoryKey))).map(key => <option key={key} value={key}>{t(key)}</option>)}</select></div></div>
      <div className="furniture-catalog-grid">{FURNITURE_CATALOG.filter(item => category === 'all' || item.categoryKey === category).map(item => <button key={item.catalogId} type="button" aria-pressed={selected === item.catalogId} className="furniture-catalog-card" onClick={() => setSelected(item.catalogId)}><FurnitureThumbnail item={item} /><strong>{t(item.labelKey)}</strong><span>{format(item.dimensions.width)} × {format(item.dimensions.depth)} × {format(item.dimensions.height)} m</span></button>)}</div>
      <p className="form-help">{t('furniture.chosen', { name: t(catalogItem(selected)!.labelKey) })}</p>
    </fieldset>{error && <p className="error-notice" role="alert">{t(error)}</p>}<div className="form-actions"><button type="button" className="button button-quiet" disabled={busy} onClick={onClose}>{t('common.cancel')}</button><button type="submit" className="button button-primary" disabled={busy}>{t(busy ? 'wizard.saving' : 'furniture.add')}</button></div></form>
  </section></ToolPanel>
}
function PositionPanel({ project, item, error, busy, onClose, onCommit, snap }: PanelProps & { item: FurnitureItem }) {
  const { t } = useTranslation(), heading = useRef<HTMLHeadingElement>(null)
  const [draft, setDraft] = useState(() => furnitureDraft(item)), [invalid, setInvalid] = useState(false)
  useEffect(() => { heading.current?.focus() }, [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    const next = furnitureFromDraft(draft, item, project.viewSettings.gridSize, snap)
    if (!next) { setInvalid(true); return }
    setInvalid(false)
    if (await onCommit({ type: 'update', item: next })) onClose()
  }
  return <ToolPanel labelId="furniture-position-title" onClose={onClose} busy={busy} returnFocus=".furniture-selected button, .furniture-tools .opening-tools-heading button"><section className="furniture-panel" aria-labelledby="furniture-position-title"><h3 ref={heading} id="furniture-position-title" tabIndex={-1}>{t('furniture.positionTitle')}</h3><p className="form-help">{t('furniture.positionHelp')}</p><form noValidate onSubmit={event => { void submit(event) }}><fieldset disabled={busy} className="wizard-fields"><legend className="sr-only">{t('furniture.positionTitle')}</legend>
    <div className="furniture-selects"><div className="form-field"><label htmlFor="furniture-edit-room">{t('openings.roomId')}</label><select id="furniture-edit-room" value={draft.roomId} onChange={event => setDraft(d => ({ ...d, roomId: event.target.value }))}>{project.rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></div><div className="form-field"><label htmlFor="furniture-unit">{t('wizard.unit')}</label><select id="furniture-unit" value={draft.unit} onChange={event => { const unit = event.target.value as 'm' | 'cm'; setDraft(d => ({ ...d, unit, x: convertPositionText(d.x, d.unit, unit), y: convertPositionText(d.y, d.unit, unit) })) }}><option value="m">{t('wizard.units.m')}</option><option value="cm">{t('wizard.units.cm')}</option></select></div></div>
    <div className="furniture-position-fields">{(['x', 'y', 'rotation'] as const).map(field => <div key={field} className="form-field"><label htmlFor={`furniture-${field}`}>{t(`furniture.${field}`)}<span className="field-unit">{field === 'rotation' ? '°' : draft.unit}</span></label><input id={`furniture-${field}`} type="text" inputMode="decimal" maxLength={32} value={draft[field]} aria-invalid={invalid} onChange={event => { setDraft(d => ({ ...d, [field]: event.target.value })); setInvalid(false) }} /></div>)}</div>
    {invalid && <p className="field-error" role="alert">{t('furniture.errors.numbers')}</p>}
    </fieldset>{error && <p className="error-notice" role="alert">{t(error)}</p>}<div className="form-actions"><button type="button" className="button button-quiet" disabled={busy} onClick={onClose}>{t('common.cancel')}</button><button type="submit" className="button button-primary" disabled={busy}>{t(busy ? 'wizard.saving' : 'furniture.save')}</button></div></form></section></ToolPanel>
}
export function FurnitureTools({ project, roomId, selectedId, onSelect, disabled, busy, snap, error, onCommit, onEditingChange }: {
  project: Project; roomId: string | null; selectedId: string | null; onSelect: (id: string | null) => void
  disabled: boolean; busy: boolean; error: string | null; snap: boolean; onCommit: (change: FurnitureChange, retry?: boolean) => Promise<boolean>; onEditingChange: (active: boolean) => void
}) {
  const { t, i18n } = useTranslation(), [panel, setPanel] = useState<'catalog' | 'position' | null>(null)
  const selected = project.furniture.find(item => item.id === selectedId)
  const format = (n: number) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 3 }).format(n)
  useEffect(() => { onEditingChange(!!panel); return () => onEditingChange(false) }, [panel, onEditingChange])
  function label(item: FurnitureItem) { const catalog = catalogItem(item.catalogId); return catalog ? t(catalog.labelKey) : t('furniture.unknown') }
  return <section className="furniture-tools" aria-labelledby="furniture-tools-title"><div className="opening-tools-heading"><h2 id="furniture-tools-title">{t('furniture.title')}</h2><button className="button button-secondary" type="button" disabled={disabled || !!panel} onClick={() => setPanel('catalog')}>{t('furniture.openCatalog')}</button></div><p className="form-help">{t('furniture.help')}</p>
    {project.furniture.length ? <ul className="furniture-list">{project.furniture.map((item, i) => <li key={item.id}><button type="button" disabled={disabled || !!panel} aria-pressed={item.id === selectedId} onClick={() => onSelect(item.id)}><strong>{i + 1}. {label(item)}</strong><span>{project.rooms.find(room => room.id === item.roomId)!.name} · {format(item.dimensions.width)} × {format(item.dimensions.depth)} × {format(item.dimensions.height)} m</span></button></li>)}</ul> : <p className="form-help">{t('furniture.empty')}</p>}
    {selected && !panel && <div className="furniture-selected"><p>{t('furniture.selectedInfo', { x: format(selected.position.x), y: format(selected.position.y), rotation: format(selected.rotation) })}</p><div className="action-group"><button className="button button-secondary" type="button" disabled={disabled} onClick={() => setPanel('position')}>{t('furniture.edit')}</button><button className="button button-secondary" type="button" disabled={disabled} onClick={() => { void onCommit({ type: 'update', item: { ...selected, rotation: normalizeRotation(selected.rotation + 90) } }, true) }}>{t('furniture.rotate')}</button><button className="button button-secondary" type="button" disabled={disabled} onClick={() => { void onCommit({ type: 'duplicate', sourceId: selected.id, id: crypto.randomUUID(), snap }, true) }}>{t('furniture.duplicate')}</button><button className="button button-quiet danger-button" type="button" disabled={disabled} onClick={() => { void onCommit({ type: 'remove', id: selected.id }, true) }}>{t('furniture.remove')}</button></div></div>}
    {panel === 'catalog' && <CatalogPanel project={project} initialRoomId={roomId} busy={busy} snap={snap} error={error} onCommit={onCommit} onClose={() => setPanel(null)} />}
    {panel === 'position' && selected && <PositionPanel key={selected.id} project={project} item={selected} busy={busy} snap={snap} error={error} onCommit={onCommit} onClose={() => setPanel(null)} />}
  </section>
}
