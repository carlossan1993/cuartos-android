import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

// Incremental, unique static closures: home → editor → viewer. Dynamic imports
// stay out until their screen is opened; shared files count exactly once.
export function bundleReport(manifest, read) {
  function closure(key, result = new Set()) {
    if (result.has(key)) return result
    if (!manifest[key]) throw new Error(`Missing manifest entry: ${key}`)
    result.add(key)
    for (const dependency of manifest[key].imports ?? []) closure(dependency, result)
    return result
  }
  function measure(keys, excluded = new Set()) {
    const files = [...new Set([...keys].flatMap(key => [manifest[key].file, ...(manifest[key].css ?? [])]))].filter(file => !excluded.has(file))
    const js = files.filter(file => file.endsWith('.js')).map(read)
    return { files, jsBytes: js.reduce((n, bytes) => n + bytes.length, 0), gzipJsBytes: js.reduce((n, bytes) => n + gzipSync(bytes).length, 0), cssBytes: files.filter(file => file.endsWith('.css')).reduce((n, file) => n + read(file).length, 0) }
  }
  const home = measure(closure('index.html'))
  const editorAdded = measure(closure('src/editor2d/Editor2D.tsx'), new Set(home.files))
  const viewerAdded = measure(closure('src/viewer3d/Viewer3D.tsx'), new Set([...home.files, ...editorAdded.files]))
  return { home, editorAdded, viewerAdded }
}

// Bytes, before HTTP compression and using zlib's default gzip. Keep Vite's
// 500 kB warning visible: this budget bounds the complete lazy 3D dependency.
export const budgets = { home: [475000, 155000], editorAdded: [345000, 106000], viewerAdded: [975000, 260000] }
export function checkBudgets(report) {
  for (const [screen, [raw, gzip]] of Object.entries(budgets)) {
    if (report[screen].jsBytes > raw || report[screen].gzipJsBytes > gzip) throw new Error(`Bundle budget exceeded: ${screen}`)
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = bundleReport(JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8')), file => readFileSync(`dist/${file}`))
  mkdirSync('test-results', { recursive: true })
  writeFileSync(`test-results/bundles-${process.env.CUARTOS_PERF_PHASE ?? 'after'}.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  checkBudgets(report)
}
