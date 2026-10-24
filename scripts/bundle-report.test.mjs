import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bundleReport, checkBudgets, budgets } from './bundle-report.mjs'

test('counts complete static closures and shared CSS once, leaving dynamic imports lazy', () => {
  const manifest = {
    'index.html': { file: 'home.js', imports: ['shared'], dynamicImports: ['src/editor2d/Editor2D.tsx'] },
    shared: { file: 'shared.js', css: ['common.css'], imports: ['cycle'] },
    cycle: { file: 'cycle.js', imports: ['shared'] },
    'src/editor2d/Editor2D.tsx': { file: 'editor.js', imports: ['shared', 'konva'], css: ['common.css'] },
    konva: { file: 'konva.js' },
    'src/viewer3d/Viewer3D.tsx': { file: 'viewer.js', imports: ['shared', 'three'] },
    three: { file: 'three.js' },
  }
  const report = bundleReport(manifest, () => Buffer.alloc(10))
  assert.deepEqual(report.home.files, ['home.js', 'shared.js', 'common.css', 'cycle.js'])
  assert.deepEqual(report.editorAdded.files, ['editor.js', 'konva.js'])
  assert.deepEqual(report.viewerAdded.files, ['viewer.js', 'three.js'])
  assert.equal(report.home.jsBytes, 30); assert.equal(report.home.cssBytes, 10)
  assert.equal(report.editorAdded.jsBytes, 20); assert.equal(report.editorAdded.cssBytes, 0)
  assert.throws(() => bundleReport({}, () => Buffer.alloc(0)), /Missing manifest/)
})
test('rejects both raw and compressed regressions on every screen', () => {
  const report = Object.fromEntries(Object.entries(budgets).map(([key, [jsBytes, gzipJsBytes]]) => [key, { jsBytes, gzipJsBytes }]))
  assert.doesNotThrow(() => checkBudgets(report))
  for (const screen of Object.keys(budgets)) for (const field of ['jsBytes', 'gzipJsBytes']) {
    const over = structuredClone(report); over[screen][field]++
    assert.throws(() => checkBudgets(over), new RegExp(screen))
  }
})
