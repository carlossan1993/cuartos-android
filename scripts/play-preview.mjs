import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
const images = JSON.parse(await readFile('play-output/images.json', 'utf8'))
const captures = images.filter(image => image.path.startsWith('screenshots/'))
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1780 }, deviceScaleFactor: 1 })
  const tiles = await Promise.all(captures.map(async image => '<figure><figcaption>' + image.path + '</figcaption><img src="data:image/png;base64,' + (await readFile('play-output/' + image.path)).toString('base64') + '"></figure>'))
  await page.setContent('<html><head><style>body{margin:0;background:#f6f5f0;color:#03038c;font:11px Arial;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:12px}figure{margin:0;min-width:0}figcaption{height:32px;overflow-wrap:anywhere}img{display:block;width:100%;height:390px;object-fit:contain;background:white;border:1px solid #ddd;box-sizing:border-box}</style></head><body>' + tiles.join('') + '</body></html>')
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())))
  await page.screenshot({ path: 'play-output/contact-sheet.png' })
  for (const path of ['graphics/icon-512.png', 'graphics/feature-es-419.png', 'graphics/feature-en-US.png', 'contact-sheet.png']) {
    const bytes = await readFile('play-output/' + path)
    console.log('PLAY_PREVIEW:' + JSON.stringify({ path, base64: bytes.toString('base64') }))
  }
  await writeFile('play-output/README.txt', 'Odamus - Play preparation\nUI captures: actual bundled web app in Chromium emulation, not physical Android screenshots. Do not claim physical QA.\nGraphics and captures: dimensions and PNG format (RGB captures/features, RGBA icon) checked in images.json.\nListing text: listing/*.json. Privacy: privacy/es.html and en.html.\nAAB is a separate artifact. See docs/PLAY_STORE.md and docs/HANDOFF.md.\n')
} finally { await browser.close() }
