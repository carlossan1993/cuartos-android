import { _android as android, expect, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { button, createDesign, design, records, saved } from './support/qa-flow.ts'

const out = 'test-results/android-smoke', pkg = 'com.carlossan1993.cuartos'
await mkdir(out, { recursive: true })
const devices = await android.devices()
if (devices.length !== 1 || !devices[0].serial().startsWith('emulator-')) throw new Error('Use exactly one disposable AVD; physical devices are not supported by this smoke script.')
const device = devices[0], check = expect.configure({ timeout: 30000 })
device.setDefaultTimeout(30000)
const shell = async (command: string) => (await device.shell(command)).toString().trim()
async function imeShown() {
  const dump = await shell('dumpsys input_method'), match = dump.match(/\bmInputShown=(true|false)\b/)
  if (!match) throw new Error('IME visibility was not available in the API 35 diagnostic.')
  return match[1] === 'true'
}
if (await shell('getprop ro.kernel.qemu') !== '1') { await device.close(); throw new Error('A disposable AVD is required.') }
const report: { status: string; metadata: Record<string, string>; cases: { name: string; status: string; pidBefore?: string; pidAfter?: string; contextRecovered?: boolean; imeDismissed?: boolean }[]; error?: string } = {
  status: 'running', metadata: { model: device.model(), serial: device.serial(), api: await shell('getprop ro.build.version.sdk'), fingerprint: await shell('getprop ro.build.fingerprint'), webview: await shell('dumpsys webviewupdate') }, cases: [],
}
let page: Page | undefined
const pageErrors: string[] = []
async function launch() {
  await shell(`am start -W -n ${pkg}/.MainActivity`)
  const view = await device.webView({ pkg })
  const current = await view.page()
  current.setDefaultTimeout(30000)
  current.on('pageerror', error => pageErrors.push(error.message))
  await check(current.locator('#language')).toBeVisible()
  check(await current.evaluate(() => (window as unknown as { Capacitor: { getPlatform(): string } }).Capacitor.getPlatform())).toBe('android')
  await check.poll(() => shell('dumpsys connectivity')).toMatch(/Active default network:\s*none/i)
  return current
}
try {
  await shell('cmd connectivity airplane-mode enable')
  await shell('svc wifi disable'); await shell('svc data disable')
  await check.poll(() => shell('settings get global airplane_mode_on')).toBe('1')
  await check.poll(() => shell('settings get global wifi_on')).toBe('0')
  report.metadata.airplaneMode = await shell('settings get global airplane_mode_on')
  report.metadata.connectivity = await shell('dumpsys connectivity')
  report.metadata.wifi = await shell('settings get global wifi_on')
  report.metadata.mobileData = await shell('settings get global mobile_data')
  // mobile_data is a saved preference, not the effective per-SIM radio state.
  // Airplane mode + disabled Wi-Fi + Android reporting no default network establish offline use.
  await shell('settings put system accelerometer_rotation 0'); await shell('settings put system user_rotation 0')
  page = await launch()
  report.metadata.webviewOnline = String(await page.evaluate(() => navigator.onLine))
  await check(page.locator('.empty-state')).toBeVisible()
  // Do not clear or overwrite any existing data, even on an emulator.
  check(await records(page)).toHaveLength(0)
  for (const es of [true, false]) for (const shape of ['rectangle', 'l', 'connected'] as const) {
    const name = `Native ${es ? 'ES' : 'EN'} ${shape}`, entry: typeof report.cases[number] = { name, status: 'running' }
    report.cases.push(entry)
    const original = await createDesign(page, es, shape, name)
    await button(page, es, 'Abrir catálogo', 'Open catalog').click()
    await check(page.getByRole('dialog')).toBeVisible()
    entry.imeDismissed = await imeShown()
    console.log(`Native checkpoint: ${name}; IME shown: ${entry.imeDismissed}`)
    if (entry.imeDismissed) {
      await shell('input keyevent 4')
      await check.poll(imeShown).toBe(false)
      await check(page.getByRole('dialog')).toBeVisible()
    }
    await shell('input keyevent 4')
    await check(page.getByRole('dialog')).toHaveCount(0)
    check(design(await saved(page, name))).toEqual(design(original))
    await button(page, es, 'Ver habitación 3D', 'View room in 3D').click()
    await check(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 60000 })
    await shell('settings put system user_rotation 1')
    await check.poll(() => page!.evaluate(() => innerWidth > innerHeight)).toBe(true)
    await writeFile(`${out}/${name.replaceAll(' ', '-')}-landscape.png`, await device.screenshot())
    await shell('settings put system user_rotation 0')
    await check.poll(() => page!.evaluate(() => innerHeight > innerWidth)).toBe(true)
    await shell('input keyevent 3') // Home backgrounds the real Android activity.
    await shell(`am start -W -n ${pkg}/.MainActivity`)
    const retry = button(page, es, 'Reintentar', 'Retry')
    entry.contextRecovered = await retry.isVisible()
    if (entry.contextRecovered) await retry.click()
    await check(page.locator('.viewer-canvas')).toHaveAttribute('data-ready', 'true')
    await shell('input keyevent 4')
    await check(page.locator('.canvas-surface canvas')).toBeVisible()
    await shell('input keyevent 4')
    await check(page.locator('.project-summary')).toBeVisible()
    await button(page, es, 'Guardar archivo', 'Save file').click()
    await device.wait({ pkg: /^(com\.google\.android\.documentsui|com\.android\.documentsui)$/ })
    await writeFile(`${out}/${name.replaceAll(' ', '-')}-chooser.png`, await device.screenshot())
    await shell('input keyevent 4')
    await check(page.locator('.file-panel [role="status"]')).toContainText(es ? 'cancelada' : 'cancelled')
    check(await saved(page, name)).toEqual(original)
    entry.pidBefore = await shell(`pidof ${pkg}`)
    check(entry.pidBefore).not.toBe('')
    await shell(`am force-stop ${pkg}`)
    await check.poll(() => shell(`pidof ${pkg}`)).toBe('')
    page = await launch()
    entry.pidAfter = await shell(`pidof ${pkg}`)
    check(entry.pidAfter).not.toBe(entry.pidBefore)
    await check(page.locator('#language')).toHaveValue(es ? 'es' : 'en')
    await page.getByRole('button', { name: `${es ? 'Abrir proyecto' : 'Open project'}: ${name}`, exact: true }).click()
    check(await saved(page, name)).toEqual(original)
    await button(page, es, 'Abrir plano 2D', 'Open 2D plan').click()
    await check(page.locator('.canvas-surface canvas')).toBeVisible()
    await check(button(page, es, 'Deshacer', 'Undo')).toBeDisabled()
    await writeFile(`${out}/${name.replaceAll(' ', '-')}-reopened.png`, await device.screenshot())
    await shell('input keyevent 4'); await check(page.locator('.project-summary')).toBeVisible()
    await shell('input keyevent 4'); await check(page.locator('.project-list')).toBeVisible()
    entry.status = 'passed'
  }
  check(pageErrors).toEqual([])
  report.status = 'passed'
} catch (error) {
  report.metadata.imeAtFailure = (await shell('dumpsys input_method').catch(() => 'unavailable')).split('\n').filter(line => /mInputShown|mIsInputViewShown|mWindowVisible/.test(line)).join('\n')
  console.log('Native failure IME: ' + report.metadata.imeAtFailure)
  if (page && !page.isClosed()) console.log('Native failure UI: ' + await page.locator('body').innerText().catch(() => 'unavailable'))
  report.status = 'failed'; report.error = error instanceof Error ? error.stack : String(error)
  await writeFile(`${out}/failure.png`, await device.screenshot()).catch(() => {})
  throw error
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2))
  await writeFile(`${out}/logcat.txt`, await shell('logcat -d -v threadtime')).catch(() => {})
  console.log('SMOKE_RESULT ' + JSON.stringify({ status: report.status, api: report.metadata.api, airplaneMode: report.metadata.airplaneMode, wifi: report.metadata.wifi, noDefaultNetwork: /Active default network:\s*none/i.test(report.metadata.connectivity ?? ''), cases: report.cases }))
  await device.close()
}
console.log(`Android WebView smoke: ${report.cases.length} cases passed, API ${report.metadata.api}.`)
