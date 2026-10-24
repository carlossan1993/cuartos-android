import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
const json = async path => JSON.parse(await readFile(path, 'utf8'))
const release = await json('play/release.json'), policy = await json('src/privacy/content.json')
const report = { release, listings: {}, policyVersion: policy.version, readyForUpload: false }
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
assert.deepEqual(Object.keys(policy.es).sort(), Object.keys(policy.en).sort())
assert.equal(policy.es.sections.length, policy.en.sections.length)
for (const lang of ['es', 'en']) {
  const html = await readFile('public/privacy/' + lang + '.html', 'utf8')
  assert.equal(html, await readFile('docs/privacy/' + lang + '.html', 'utf8'), 'Hosted policy snapshot must match generated app policy')
  assert(html.includes('<html lang="' + lang + '">'))
  assert(html.includes(policy[lang].title))
  assert(!/<script|<iframe|<img|https?:\/\/[^"'\s>]+\.(?:js|css)/i.test(html))
}
const gradle = await readFile('android/app/build.gradle', 'utf8')
assert(gradle.includes('applicationId "' + release.applicationId + '"'))
assert(gradle.includes('versionCode ' + release.versionCode))
assert(gradle.includes('versionName "' + release.versionName + '"'))
const variables = await readFile('android/variables.gradle', 'utf8')
assert(variables.includes('targetSdkVersion = ' + release.targetSdk))
assert(variables.includes('minSdkVersion = ' + release.minSdk))
report.readyForUpload = release.ownerConfirmed && release.targetAudienceConfirmed && release.physicalQaComplete &&
  typeof release.supportEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(release.supportEmail) &&
  typeof release.privacyPolicyUrl === 'string' && /^https:\/\//.test(release.privacyPolicyUrl)
await mkdir('play-output', { recursive: true })
await writeFile('play-output/preflight.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ listings: report.listings, policy: policy.version, readyForUpload: report.readyForUpload }))
if (process.argv.includes('--require-ready')) assert(report.readyForUpload, 'Owner details, active privacy URL and physical QA must be completed before signing for upload.')
