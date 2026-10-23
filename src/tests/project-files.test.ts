import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { Dexie } from 'dexie'
import { createProject, MAX_PROJECT_JSON_BYTES, serializeProject } from '../domain/project'
import { getWalls } from '../geometry/rooms'
import { furnitureCorners } from '../furniture/geometry'
import { worldToScreen } from '../editor2d/viewport'
import { initialRoomDraft, projectFromRoomDraft } from '../projects/room-draft'
import { copyProject } from '../projects/project-copy'
import { createProjectRepository } from '../storage/project-repository'
import { fileName, jsonFile, readProjectFile } from '../files/project-files'
import { planLayout } from '../files/plan-layout'
import { deliverNativeFile, MAX_EXPORT_BYTES } from '../files/native-files'

let sequence = 0
const id = () => `file-${++sequence}`, now = () => new Date('2026-10-23T18:00:00.000Z')
function fixture(shape: 'rectangle' | 'l' | 'connected' = 'connected') {
  const p = projectFromRoomDraft({ ...initialRoomDraft, shape, projectName: 'Casa Ñandú', roomName: 'Sala', room2Name: 'Estudio' }, 'es', { id, now })
  const room = p.rooms[0], wallId = getWalls(room)[0].id
  return { ...p, viewSettings: { ...p.viewSettings, grid: false, snap: false, zoom2d: 2.4, camera3d: { position: { x: 3, y: 9, z: 4 }, target: { x: 3, y: 1, z: 4 } } },
    rooms: p.rooms.map(room => ({ ...room, floorMaterial: { color: '#c39a68', textureId: 'floor-planks' } })),
    openings: [{ id: id(), roomId: room.id, wallId, type: 'door' as const, offset: .3, width: .8, height: 2, sillHeight: 0 }],
    furniture: [{ id: id(), roomId: p.rooms.at(-1)!.id, catalogId: 'future-piece', position: { x: 1, y: 1 }, rotation: 37, dimensions: { width: .6, depth: .7, height: .8 }, materialOverrides: { body: { color: '#03038c', textureId: 'unknown-texture' } } }],
  }
}
describe('portable project JSON', () => {
  it.each(['rectangle', 'l', 'connected'] as const)('round-trips every field of %s through an actual UTF-8 Blob', async shape => {
    const project = fixture(shape), before = serializeProject(project), file = jsonFile(project)
    expect(file.name).toBe('cuartos-Casa-Nandu.json'); expect(file.blob.type).toBe('application/json')
    expect(await file.blob.text()).toBe(before)
    expect(await readProjectFile(file.blob)).toEqual(project)
    expect(serializeProject(project)).toBe(before)
  })
  it('accepts a UTF-8 BOM and an exact byte-limit file, rejecting oversized input before reading', async () => {
    const json = serializeProject(fixture()), bom = new Blob(['\ufeff', json])
    expect(await readProjectFile(bom)).toEqual(JSON.parse(json))
    const bytes = new TextEncoder().encode(json).byteLength
    expect(await readProjectFile(new Blob([json, ' '.repeat(MAX_PROJECT_JSON_BYTES - bytes)]))).toEqual(JSON.parse(json))
    const arrayBuffer = vi.fn()
    await expect(readProjectFile({ size: MAX_PROJECT_JSON_BYTES + 1, arrayBuffer })).rejects.toMatchObject({ code: 'size' })
    expect(arrayBuffer).not.toHaveBeenCalled()
    await expect(readProjectFile(new Blob([json, ' '.repeat(MAX_PROJECT_JSON_BYTES - bytes + 1)]))).rejects.toMatchObject({ code: 'size' })
  })
  it('rejects malformed, future, invalid-reference and non-UTF-8 files with useful error categories', async () => {
    const p = fixture()
    for (const [text, code] of [['{broken', 'invalid'], [JSON.stringify({ ...p, schemaVersion: 999 }), 'version'], [JSON.stringify({ ...p, openings: [{ ...p.openings[0], roomId: 'missing' }] }), 'invalid'], [JSON.stringify(p).slice(0, -1) + ',"__proto__":{"polluted":true}}', 'invalid']]) {
      await expect(readProjectFile(new Blob([text]))).rejects.toMatchObject({ code })
    }
    await expect(readProjectFile(new Blob([new Uint8Array([0xff, 0xfe])]))).rejects.toMatchObject({ code: 'read' })
    await expect(readProjectFile({ size: 10, arrayBuffer: async () => { throw new Error('read denied') } })).rejects.toMatchObject({ code: 'read' })
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
  })
  it('imports as an independent copy without overwriting a colliding original, even after reopen', async () => {
    const name = `files-${crypto.randomUUID()}`, repo = createProjectRepository(name), original = fixture()
    let reopened: ReturnType<typeof createProjectRepository> | undefined
    try {
      await repo.create(original)
      const loaded = await readProjectFile(jsonFile(original).blob), copy = copyProject(loaded, 'Importada', { id, now })
      await repo.create(copy); await expect(repo.create(copy)).rejects.toBeDefined()
      expect(await repo.get(original.id)).toEqual(original)
      expect(copy.rooms.map(room => room.id)).not.toEqual(original.rooms.map(room => room.id))
      expect(copy.openings[0].wallId).toBe(getWalls(copy.rooms[0])[0].id)
      expect(copy.furniture[0].materialOverrides).toEqual(original.furniture[0].materialOverrides)
      repo.close(); reopened = createProjectRepository(name)
      expect(await reopened.get(copy.id)).toEqual(copy); expect((await reopened.list()).projects).toHaveLength(2)
    } finally { repo.close(); reopened?.close(); await Dexie.delete(name) }
  })
  it('builds safe bounded names for paths, Unicode, punctuation and empty stems', () => {
    for (const name of ['../../a/b\\c', 'Casa "ñ"\n', '🪑', 'a'.repeat(120), 'CON', '.hidden']) {
      const generated = fileName(name, 'png')
      expect(generated).toMatch(/^cuartos-[A-Za-z0-9_-]+\.png$/); expect(generated.length).toBeLessThanOrEqual(76)
    }
  })
})

describe('bounded PNG layout', () => {
  it.each([1024, 2048])('frames all rooms and rotated legacy furniture at %i pixels without using screen state', width => {
    const source = fixture(), p = { ...source, furniture: [{ ...source.furniture[0], position: { x: -5, y: 9 }, rotation: 47 }] }, before = serializeProject(p)
    const layout = planLayout(p, width)
    expect([layout.width, layout.height]).toEqual([width, width * .75])
    for (const point of [...p.rooms.flatMap(room => [...room.polygon]), ...furnitureCorners(p.furniture[0])]) {
      const rendered = worldToScreen(point, layout.scene.camera)
      expect(rendered.x).toBeGreaterThanOrEqual(63.99); expect(rendered.x).toBeLessThanOrEqual(960.01)
      expect(rendered.y).toBeGreaterThanOrEqual(63.99); expect(rendered.y).toBeLessThanOrEqual(704.01)
    }
    expect(serializeProject(p)).toBe(before)
  })
  it('rejects unsupported dimensions and empty projects before canvas allocation', () => {
    for (const width of [0, 3072, 4096, Infinity, NaN, 1024.5]) expect(() => planLayout(fixture(), width)).toThrow()
    expect(() => planLayout(createProject({ id: 'empty', name: 'Empty', language: 'en', now: now().toISOString() }), 1024)).toThrow()
  })
})

function native() {
  return { fs: { writeFile: vi.fn(async () => ({ uri: 'file:///cache/cuartos-exports/one/cuartos-Casa.json' })), readdir: vi.fn(async () => ({ files: [] as { name: string; type: 'directory'; size: number; mtime: number; uri: string }[] })), rmdir: vi.fn(async () => {}) },
    share: { share: vi.fn(async () => ({ activityType: 'test.app' })) }, document: { save: vi.fn(async () => ({ status: 'saved' as 'saved' | 'cancelled' })) }, id: () => 'one', now: () => 200_000_000 }
}
describe('Android file delivery adapter', () => {
  it('writes exact Unicode JSON as base64 before invoking save and never invokes share implicitly', async () => {
    const deps = native(), file = jsonFile(fixture())
    expect(await deliverNativeFile(file, 'save', 'Cuartos', deps)).toBe('saved')
    const data = deps.fs.writeFile.mock.calls[0] as unknown as [{ directory: string; path: string; data: string; recursive: boolean }]
    expect(data[0]).toMatchObject({ directory: 'CACHE', path: `cuartos-exports/one/${file.name}`, recursive: true })
    expect(new TextDecoder().decode(Uint8Array.from(atob(data[0].data), c => c.charCodeAt(0)))).toBe(await file.blob.text())
    expect(deps.document.save).toHaveBeenCalledWith({ path: `cuartos-exports/one/${file.name}`, name: file.name, mime: 'application/json' })
    expect(deps.share.share).not.toHaveBeenCalled()
  })
  it('preserves PNG bytes and shares a local file URI only after writing', async () => {
    const deps = native(), file = { name: 'cuartos-Casa.png', blob: new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }) }
    deps.fs.writeFile.mockResolvedValue({ uri: 'file:///cache/cuartos-exports/one/cuartos-Casa.png' })
    expect(await deliverNativeFile(file, 'share', 'Cuartos', deps)).toBe('shared')
    expect(deps.share.share).toHaveBeenCalledWith({ files: ['file:///cache/cuartos-exports/one/cuartos-Casa.png'], title: 'Cuartos', dialogTitle: 'Cuartos' })
    expect(deps.document.save).not.toHaveBeenCalled()
    const options = deps.fs.writeFile.mock.calls[0] as unknown as [{ data: string }]
    expect([...Uint8Array.from(atob(options[0].data), c => c.charCodeAt(0))]).toEqual([137, 80, 78, 71])
  })
  it('keeps cancellation distinct from failure for both native actions', async () => {
    const deps = native(), file = jsonFile(fixture())
    deps.document.save.mockResolvedValue({ status: 'cancelled' })
    expect(await deliverNativeFile(file, 'save', 'Cuartos', deps)).toBe('cancelled')
    deps.share.share.mockRejectedValue(new Error('Share canceled'))
    expect(await deliverNativeFile(file, 'share', 'Cuartos', deps)).toBe('cancelled')
    deps.share.share.mockRejectedValue(new Error('Missing activity'))
    await expect(deliverNativeFile(file, 'share', 'Cuartos', deps)).rejects.toMatchObject({ code: 'write' })
  })
  it('a failed write never opens a chooser; retry writes before saving, while old cache cleanup is best effort', async () => {
    const deps = native(), file = jsonFile(fixture())
    deps.fs.writeFile.mockRejectedValueOnce(new Error('Full'))
    await expect(deliverNativeFile(file, 'save', 'Cuartos', deps)).rejects.toMatchObject({ code: 'write' })
    expect(deps.document.save).not.toHaveBeenCalled()
    deps.fs.readdir.mockResolvedValue({ files: [{ name: 'old', type: 'directory', size: 0, mtime: 1, uri: '' }, { name: 'fresh', type: 'directory', size: 0, mtime: deps.now(), uri: '' }, { name: '../private', type: 'directory', size: 0, mtime: 1, uri: '' }] })
    deps.fs.rmdir.mockRejectedValue(new Error('Unavailable'))
    expect(await deliverNativeFile(file, 'save', 'Cuartos', deps)).toBe('saved')
    expect(deps.fs.rmdir).toHaveBeenCalledTimes(1); expect(deps.fs.rmdir).toHaveBeenCalledWith({ directory: 'CACHE', path: 'cuartos-exports/old', recursive: true })
  })
  it('rejects unsafe names, empty or oversized files, invalid directories and nonlocal share URIs', async () => {
    const deps = native(), file = jsonFile(fixture())
    for (const bad of [{ ...file, name: '../private.json' }, { ...file, name: 'cuartos-Casa.png' }, { ...file, blob: new Blob([]) }, { ...file, blob: new Blob([new Uint8Array(MAX_EXPORT_BYTES + 1)], { type: 'application/json' }) }]) await expect(deliverNativeFile(bad, 'save', '', deps)).rejects.toMatchObject({ code: 'write' })
    await expect(deliverNativeFile(file, 'save', '', { ...deps, id: () => '../private' })).rejects.toMatchObject({ code: 'write' })
    expect(deps.fs.writeFile).not.toHaveBeenCalled()
    deps.fs.writeFile.mockResolvedValue({ uri: 'https://example.com/private' })
    await expect(deliverNativeFile(file, 'share', '', deps)).rejects.toMatchObject({ code: 'write' })
    expect(deps.share.share).not.toHaveBeenCalled()
  })
})
