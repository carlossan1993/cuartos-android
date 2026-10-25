import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const policy = JSON.parse(await readFile(new URL('../src/privacy/content.json', import.meta.url), 'utf8'))
const output = resolve(process.argv[2] ?? 'public/privacy')
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
await mkdir(output, { recursive: true })
for (const lang of ['es', 'en']) {
  const copy = policy[lang]
  const html = `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>Odamus · ${escape(copy.title)}</title>
<style>body{margin:0;background:#f6f5f0;color:#202438;font:17px/1.75 system-ui,sans-serif}main{max-width:76ch;margin:auto;padding:32px 22px 64px}h1,h2,a{color:#03038c}h1{font-size:32px}h2{font-size:23px;margin-top:32px}a{overflow-wrap:anywhere}nav a{display:inline-block;padding:12px}small{color:#5d6372}</style></head>
<body><main><nav aria-label="Language"><a href="es.html" lang="es">Español</a><a href="en.html" lang="en">English</a></nav>
<h1>Odamus · ${escape(copy.title)}</h1><small>${escape(copy.updated)}</small><p>${escape(copy.introduction)}</p>
${copy.sections.map(section => `<section><h2>${escape(section.title)}</h2><p>${escape(section.text)}</p></section>`).join('\n')}
<p>${escape(copy.contact)} <a href="${escape(policy.contactUrl)}" rel="noopener noreferrer">${escape(copy.contactLabel)}</a></p><p>${escape(copy.contactWarning)}</p>
</main></body></html>\n`
  await writeFile(resolve(output, lang + '.html'), html)
}
await writeFile(resolve(output, 'index.html'), '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Odamus · Privacidad / Privacy</title></head><body><h1>Odamus · Privacidad / Privacy</h1><p><a href="es.html">Política de privacidad · Español</a></p><p><a href="en.html">Privacy policy · English</a></p></body></html>\n')
console.log('Privacy HTML generated: ES/EN, bundled text is the source of truth.')
