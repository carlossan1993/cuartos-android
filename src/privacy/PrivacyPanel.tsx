import { useTranslation } from 'react-i18next'
import { ToolPanel } from '../components/ToolPanel'
import policy from './content.json'

export default function PrivacyPanel({ onClose }: { onClose: () => void }) {
  const { i18n } = useTranslation()
  const copy = i18n.resolvedLanguage?.startsWith('en') ? policy.en : policy.es
  return <ToolPanel labelId="privacy-title" onClose={onClose} busy={false} returnFocus="#privacy-open">
    <article className="privacy-copy">
      <h2 id="privacy-title" tabIndex={-1}>{copy.title}</h2>
      <p className="privacy-version">{copy.updated}</p><p>{copy.introduction}</p>
      {copy.sections.map(section => <section key={section.title}><h3>{section.title}</h3><p>{section.text}</p></section>)}
      <p>{copy.contact} <a href={policy.contactUrl} rel="noopener noreferrer">{copy.contactLabel}</a></p>
      <p>{copy.contactWarning}</p>
    </article>
  </ToolPanel>
}
