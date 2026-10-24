import { useTranslation } from 'react-i18next'
import { saveLanguage, type Language } from '../i18n/language'
export function LanguagePicker({ id = 'language' }: { id?: string }) {
  const { t, i18n } = useTranslation()
  return <div className="language-control"><label htmlFor={id}>{t('language.label')}</label><select id={id} value={i18n.resolvedLanguage} onChange={event => { const language = event.target.value as Language; saveLanguage(language); void i18n.changeLanguage(language) }}><option value="es">{t('language.spanish')}</option><option value="en">{t('language.english')}</option></select></div>
}
