import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { RoomPreview } from '../components/RoomPreview'
import { fromMeters, type LengthUnit } from '../geometry/units'
import { createRoomProject } from './create-room-project'
import { convertMeasurementText, initialRoomDraft, MAX_ROOM_SIZE, MIN_ROOM_SIZE, readMeasurement, validateRoomDraft, type DraftErrors, type DraftField, type RoomDraft } from './room-draft'

export function CreateProjectWizard({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const { t, i18n } = useTranslation()
  const [draft, setDraft] = useState<RoomDraft>({ ...initialRoomDraft })
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const pending = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => { heading.current?.focus() }, [step])

  const format = (n: number) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 4 }).format(n)
  const range = { min: format(fromMeters(MIN_ROOM_SIZE, draft.unit)), max: format(fromMeters(MAX_ROOM_SIZE, draft.unit)), unit: draft.unit }
  const width = readMeasurement(draft.width, draft.unit), depth = readMeasurement(draft.depth, draft.unit)

  function update(field: DraftField, value: string) {
    setDraft(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
    setSaveError(false)
  }
  function changeUnit(unit: LengthUnit) {
    setDraft(current => ({
      ...current, unit,
      width: convertMeasurementText(current.width, current.unit, unit),
      depth: convertMeasurementText(current.depth, current.unit, unit),
      height: convertMeasurementText(current.height, current.unit, unit),
    }))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending.current) return
    const all = validateRoomDraft(draft)
    const fields: DraftField[] = step === 1 ? ['projectName', 'roomName'] : ['projectName', 'roomName', 'width', 'depth', 'height']
    const first = fields.find(field => all[field])
    if (first) {
      setErrors(Object.fromEntries(fields.filter(field => all[field]).map(field => [field, all[field]])))
      form.current?.querySelector<HTMLInputElement>(`#${first}`)?.focus()
      return
    }
    if (step === 1) { setStep(2); setErrors({}); return }
    pending.current = true
    setSaving(true); setSaveError(false)
    try {
      await createRoomProject(draft, i18n.resolvedLanguage === 'en' ? 'en' : 'es')
      onCreated()
    } catch {
      setSaveError(true)
    } finally { pending.current = false; setSaving(false) }
  }

  function input(field: DraftField, measure = false) {
    const error = errors[field]
    return (
      <div className="form-field" key={field}>
        <label htmlFor={field}>{t(`wizard.${field}`)}{measure && <span className="field-unit">{draft.unit}</span>}</label>
        <input id={field} name={field} type="text" inputMode={measure ? 'decimal' : 'text'} autoComplete="off" maxLength={measure ? 32 : 120}
          value={draft[field]} onChange={e => update(field, e.target.value)} aria-invalid={!!error}
          aria-describedby={error ? `${field}-error` : measure ? 'measure-help' : undefined} />
        {error && <p className="field-error" id={`${field}-error`} role="alert">{t(`wizard.errors.${error}`, range)}</p>}
      </div>
    )
  }

  return (
    <section className="creation" aria-labelledby="create-title">
      <p className="eyebrow">{t('wizard.step', { current: step, total: 2 })}</p>
      <h1 className="page-title" id="create-title" ref={heading} tabIndex={-1}>{t(step === 1 ? 'wizard.title' : 'wizard.measureTitle')}</h1>
      <p className="page-intro">{t(step === 1 ? 'wizard.description' : 'wizard.measureDescription')}</p>
      <ol className="step-list" aria-label={t('wizard.progress')}>
        <li aria-current={step === 1 ? 'step' : undefined} className={step >= 1 ? 'active' : ''}><span>1</span>{t('wizard.names')}</li>
        <li aria-current={step === 2 ? 'step' : undefined} className={step === 2 ? 'active' : ''}><span>2</span>{t('wizard.measures')}</li>
      </ol>
      <form ref={form} noValidate onSubmit={e => { void submit(e) }} aria-busy={saving}>
        <fieldset disabled={saving} className="wizard-fields">
          <legend className="sr-only">{t(step === 1 ? 'wizard.names' : 'wizard.measures')}</legend>
          <div className="wizard-grid">
            <div className="form-panel">
              {step === 1 ? <>
                {input('projectName')}{input('roomName')}
                <div className="shape-card"><span className="rectangle-symbol" aria-hidden="true" /><div><span className="small-label">{t('wizard.shape')}</span><strong>{t('wizard.rectangle')}</strong></div><span className="shape-check" aria-hidden="true">✓</span></div>
              </> : <>
                <fieldset className="unit-options"><legend>{t('wizard.unit')}</legend>
                  {(['m', 'cm'] as const).map(unit => <label key={unit}><input type="radio" name="unit" value={unit} checked={draft.unit === unit} onChange={() => changeUnit(unit)} />{t(`wizard.units.${unit}`)}</label>)}
                </fieldset>
                <div className="measure-fields">{input('width', true)}{input('depth', true)}{input('height', true)}</div>
                <p className="form-help" id="measure-help">{t('wizard.range', range)}</p>
              </>}
            </div>
            <figure className="creation-preview">
              {width !== null && depth !== null ? <RoomPreview width={width} depth={depth} /> : <div className="preview-placeholder">{t('wizard.previewPending')}</div>}
              <figcaption>{t('wizard.previewCaption')}</figcaption>
              {width !== null && depth !== null && <p className="area-preview">{new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 2 }).format(width * depth)} <span>m² · {t('room.area')}</span></p>}
            </figure>
          </div>
        </fieldset>
        {saveError && <div className="error-notice" role="alert">{t('storage.saveError')}</div>}
        <div className="form-actions">
          <button className="button button-quiet" type="button" disabled={saving} onClick={onCancel}>{t('common.cancel')}</button>
          <div className="action-group">
            {step === 2 && <button className="button button-secondary" type="button" disabled={saving} onClick={() => { setStep(1); setErrors({}) }}>{t('common.back')}</button>}
            <button className="button button-primary" type="submit" disabled={saving}>{t(saving ? 'wizard.saving' : step === 1 ? 'common.next' : 'wizard.create')}</button>
          </div>
        </div>
      </form>
    </section>
  )
}
