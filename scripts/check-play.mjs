import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
const json = async path => JSON.parse(await readFile(path, 'utf8'))
const release = await json('play/release.json'), policy = await json('src/privacy/content.json')
const report = { release, listings: {}, policyVersion: policy.version, readyForSigning: false, readyForUpload: false }
for (const locale of ['es-419', 'en-US']) {
  const copy = await json('play/listing/' + locale + '.json')
  const lengths = {}
  for (const [field, max] of Object.entries({ title: 30, shortDescription: 80, fullDescription: 4000, releaseNotes: 500 })) {
    const n = [...copy[field]].length; assert(n > 0 && n <= max, locale + '.' + field + ' exceeds limit'); lengths[field] = n
  }
  assert.equal(copy.title, release.appName)
  report.listings[locale] = lengths
}
assert.equal(policy.app, release.appName)
assert.equal(policy.contactEmail, release.supportEmail)
assert.equal(policy.contactUrl, 'mailto:' + release.supportEmail)
assert(!/github|carlos|sandoval/i.test(JSON.stringify(policy)), 'Public privacy policy must not expose personal names or GitHub links')
const firebase = await json('firebase.json')
assert.deepEqual(Object.keys(firebase), ['hosting'])
assert.equal(firebase.hosting.target, 'cuartos-privacy')
assert.equal(firebase.hosting.public, 'docs/privacy')
assert.deepEqual(Object.keys(policy.es).sort(), Object.keys(policy.en).sort())
assert.equal(policy.es.sections.length, policy.en.sections.length)
for (const lang of ['es', 'en']) {
  const html = await readFile('public/privacy/' + lang + '.html', 'utf8')
  assert.equal(html, await readFile('docs/privacy/' + lang + '.html', 'utf8'), 'Hosted policy snapshot must match generated app policy')
  assert(html.includes('<html lang="' + lang + '">'))
  assert(html.includes(policy[lang].title))
  assert(html.includes('mailto:' + release.supportEmail))
  assert(!/github|carlos|sandoval/i.test(html), 'Public privacy HTML contains a forbidden identity or link')
  assert(!/<script|<iframe|<img|https?:\/\/[^"'\s>]+\.(?:js|css)/i.test(html))
}
const gradle = await readFile('android/app/build.gradle', 'utf8')
assert(gradle.includes('applicationId "' + release.applicationId + '"'))
assert(gradle.includes('versionCode ' + release.versionCode))
assert(gradle.includes('versionName "' + release.versionName + '"'))
const variables = await readFile('android/variables.gradle', 'utf8')
assert(variables.includes('targetSdkVersion = ' + release.targetSdk))
assert(variables.includes('minSdkVersion = ' + release.minSdk))
report.readyForSigning = release.ownerConfirmed && release.targetAudienceConfirmed &&
  typeof release.supportEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(release.supportEmail) &&
  typeof release.privacyPolicyUrl === 'string' && /^https:\/\//.test(release.privacyPolicyUrl)
report.readyForUpload = report.readyForSigning && release.physicalQaComplete
if (process.argv.includes('--require-signing') || process.argv.includes('--require-ready')) {
  assert(report.readyForSigning, 'Owner details and public privacy URL must be completed before signing.')
  const response = await fetch(release.privacyPolicyUrl, { signal: AbortSignal.timeout(15000) })
  assert(response.ok && response.headers.get('content-type')?.includes('text/html'), 'Privacy URL must serve public HTML successfully.')
  const html = await response.text()
  assert(html.includes(policy.version) && (html.includes(policy.es.title) || html.includes(policy.en.title)), 'Public privacy policy must match the bundled version.')
  assert(html.includes('mailto:' + release.supportEmail) && !/github|carlos|sandoval/i.test(html), 'Public privacy contact must match the app without personal names or GitHub links.')
}
await mkdir('play-output', { recursive: true })
await writeFile('play-output/preflight.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ listings: report.listings, policy: policy.version, readyForSigning: report.readyForSigning, readyForUpload: report.readyForUpload }))
if (process.argv.includes('--require-ready')) assert(report.readyForUpload, 'Physical QA evidence must be completed before distribution.')
