import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RoomIllustration } from '../components/RoomIllustration'
import { saveLanguage, type Language } from '../i18n/language'

export function App() {
  const { t, i18n } = useTranslation()
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? 'es'
    document.title = t('app.title')
  }, [i18n.resolvedLanguage, t])

  function changeLanguage(language: Language) {
    saveLanguage(language)
    void i18n.changeLanguage(language)
  }

  return (
    <div className="app-shell">
      <header className="header">
        <a className="brand" href="#main" aria-label={t('app.name')}>
          <img src="/icon.svg" alt="" width="40" height="40" />
          <span>{t('app.name')}<span className="brand-dot">.</span></span>
        </a>
        <div className="language-control">
          <label htmlFor="language">{t('language.label')}</label>
          <select id="language" value={i18n.resolvedLanguage} onChange={e => changeLanguage(e.target.value as Language)}>
            <option value="es">{t('language.spanish')}</option>
            <option value="en">{t('language.english')}</option>
          </select>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="hero" aria-labelledby="welcome-title">
          <div className="hero-copy">
            <p className="eyebrow">{t('home.eyebrow')}</p>
            <h1 id="welcome-title">{t('home.title')}</h1>
            <p className="intro">{t('home.description')}</p>
            <p className="local-note"><span aria-hidden="true">◌</span>{t('home.localNote')}</p>
          </div>
          <figure className="plan-card">
            <RoomIllustration />
            <figcaption>{t('home.planCaption')}</figcaption>
          </figure>
        </section>
        <section className="projects" aria-labelledby="projects-title">
          <div className="section-heading"><span className="section-marker" aria-hidden="true" /><h2 id="projects-title">{t('home.projects')}</h2></div>
          <div className="empty-state">
            <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 22h18V8m0 14v18m0-12h14" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            <div><h3>{t('home.emptyTitle')}</h3><p>{t('home.emptyDescription')}</p></div>
          </div>
        </section>
      </main>
      <footer>{t('home.footer')}</footer>
    </div>
  )
}
