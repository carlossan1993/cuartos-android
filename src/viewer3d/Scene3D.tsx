import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, PerspectiveCamera, Spherical, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Project, Room, ViewSettings } from '../domain/types'
import { buildRoom3D, sceneBounds, wallFacesCamera, type Room3D, type SceneBounds, type Solid3D } from './model'
import { floorGeometry, solidGeometry } from './geometry'
import { floorTexture } from './texture'
import { cameraLimits, fitDistance } from './camera'
import { FurnitureScene } from './FurnitureScene'
import { automaticCamera } from '../projects/view-preferences'
import { buildFurnitureSet3D } from '../furniture/model3d'

export type CameraCommandKind = 'fit' | 'top' | 'zoomIn' | 'zoomOut' | 'left' | 'right' | 'up' | 'down' | 'panLeft' | 'panRight' | 'panForward' | 'panBack'
export type CameraReader = () => ViewSettings['camera3d']
export interface CameraCommand { sequence: number; kind: CameraCommandKind }

function Floor({ room }: { room: Room }) {
  const gl = useThree(state => state.gl), { polygon, floorMaterial } = room
  const geometry = useMemo(() => floorGeometry({ polygon }), [polygon])
  const texture = useMemo(() => { const texture = floorTexture(floorMaterial); if (texture) texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy()); return texture }, [floorMaterial, gl])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => texture?.dispose(), [texture])
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial attach="material-0" color={texture ? '#ffffff' : room.floorMaterial.color} map={texture} roughness={1} /><meshStandardMaterial attach="material-1" color="#b9b4aa" roughness={1} /></mesh>
}
function Solids({ solids, color }: { solids: readonly Solid3D[]; color: string }) {
  const geometry = useMemo(() => solidGeometry(solids), [solids])
  useEffect(() => () => geometry.dispose(), [geometry])
  return solids.length ? <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.9} /></mesh> : null
}
const RoomScene = memo(function RoomScene({ model, origin, cutaway }: { model: Room3D; origin: readonly [number, number, number]; cutaway: boolean }) {
  const wallGroups = useRef(new Map<string, Group>()), cornerGroups = useRef(new Map<string, Group>())
  const invalidate = useThree(state => state.invalidate)
  const cornerSolids = useMemo(() => model.corners.map(corner => [corner.solid]), [model])
  useLayoutEffect(() => { invalidate() }, [cutaway, invalidate])
  useFrame(({ camera, gl }) => {
    let changed = false
    for (const wall of model.walls) {
      const group = wallGroups.current.get(wall.id), visible = !cutaway || !wallFacesCamera(wall, camera.position.x + origin[0], camera.position.z + origin[2])
      if (group && group.visible !== visible) { group.visible = visible; changed = true }
    }
    model.corners.forEach(corner => {
      const group = cornerGroups.current.get(corner.walls.join('|')), visible = corner.walls.every(id => wallGroups.current.get(id)?.visible ?? true)
      if (group && group.visible !== visible) { group.visible = visible; changed = true }
    })
    if (changed) gl.shadowMap.needsUpdate = true
  })
  return <group><Floor room={model.room} />{model.walls.map(wall => <group key={wall.id} ref={node => { if (node) wallGroups.current.set(wall.id, node); else wallGroups.current.delete(wall.id) }}>
    <Solids solids={wall.solids} color={wall.material.color} />
    {wall.openings.map(opening => <mesh key={opening.id} position={[...opening.solid.center]} rotation={[0, opening.solid.rotationY, 0]} castShadow={opening.type === 'door'}><boxGeometry args={[...opening.solid.size]} /><meshStandardMaterial color={opening.type === 'door' ? '#c39a68' : '#96c4d3'} transparent={opening.type === 'window'} opacity={opening.type === 'window' ? .3 : 1} depthWrite={opening.type !== 'window'} roughness={opening.type === 'window' ? .3 : .85} /></mesh>)}
  </group>)}{model.corners.map((corner, index) => <group key={corner.walls.join('|')} ref={node => { const id = corner.walls.join('|'); if (node) cornerGroups.current.set(id, node); else cornerGroups.current.delete(id) }}><Solids solids={cornerSolids[index]} color={corner.material.color} /></group>)}</group>
})
function CameraRig({ bounds, command, initialCamera, onCapture }: { bounds: SceneBounds; command: CameraCommand; initialCamera: ViewSettings['camera3d']; onCapture: (reader: CameraReader | null) => void }) {
  const get = useThree(state => state.get), invalidate = useThree(state => state.invalidate), size = useThree(state => state.size)
  const [savedCamera] = useState(initialCamera)
  const controls = useRef<OrbitControls | null>(null), previousFit = useRef<number | null>(null), lastCommand = useRef<number | null>(null)
  const preset = useCallback((top: boolean) => {
    const { camera } = get()
    const orbit = controls.current
    if (!orbit) return
    const distance = fitDistance(bounds, size.width / Math.max(1, size.height)), target = new Vector3(0, bounds.center[1], 0)
    orbit.target.copy(target)
    const direction = top ? new Vector3(0, 1, .035).normalize() : new Vector3(1, .95, 1.2).normalize()
    camera.position.copy(target).addScaledVector(direction, distance)
    camera.lookAt(target); orbit.update(); invalidate()
  }, [get, invalidate, bounds, size.width, size.height])
  useEffect(() => {
    const { camera, gl } = get()
    const orbit = new OrbitControls(camera, gl.domElement), change = () => invalidate()
    orbit.enableDamping = false; orbit.autoRotate = false
    orbit.minPolarAngle = .03; orbit.maxPolarAngle = Math.PI / 2 - .03
    orbit.cursor.set(0, bounds.center[1], 0); orbit.maxTargetRadius = bounds.radius * 2
    orbit.target.copy(orbit.cursor)
    orbit.addEventListener('change', change)
    controls.current = orbit
    onCapture(() => { const { camera } = get(); return { position: { x: camera.position.x + bounds.center[0], y: camera.position.y, z: camera.position.z + bounds.center[2] }, target: { x: orbit.target.x + bounds.center[0], y: orbit.target.y, z: orbit.target.z + bounds.center[2] } } })
    return () => { onCapture(null); orbit.removeEventListener('change', change); orbit.dispose(); controls.current = null }
  }, [get, invalidate, bounds, onCapture])
  useEffect(() => {
    const orbit = controls.current
    if (!orbit) return
    const { camera } = get()
    const fitted = fitDistance(bounds, size.width / Math.max(1, size.height)), limits = cameraLimits(bounds)
    if (camera instanceof PerspectiveCamera) { camera.near = limits.near; camera.far = Math.max(limits.far, fitted * 10); camera.updateProjectionMatrix() }
    orbit.minDistance = limits.minDistance; orbit.maxDistance = Math.max(limits.maxDistance, fitted * 4)
    if (previousFit.current === null) {
      if (automaticCamera(savedCamera)) preset(false)
      else {
        orbit.target.set(savedCamera.target.x - bounds.center[0], savedCamera.target.y, savedCamera.target.z - bounds.center[2])
        camera.position.set(savedCamera.position.x - bounds.center[0], savedCamera.position.y, savedCamera.position.z - bounds.center[2])
        camera.lookAt(orbit.target); orbit.update(); invalidate()
      }
    }
    else { camera.position.sub(orbit.target).multiplyScalar(fitted / previousFit.current).add(orbit.target); orbit.update(); invalidate() }
    previousFit.current = fitted
  }, [bounds, get, invalidate, size.width, size.height, preset, savedCamera])
  useEffect(() => {
    const orbit = controls.current
    if (!orbit) return
    if (lastCommand.current === command.sequence) return
    if (lastCommand.current === null && command.sequence === 0) { lastCommand.current = 0; return }
    lastCommand.current = command.sequence
    const { camera } = get()
    if (command.kind === 'fit' || command.kind === 'top') { preset(command.kind === 'top'); return }
    if (command.kind === 'zoomIn' || command.kind === 'zoomOut') camera.position.sub(orbit.target).multiplyScalar(command.kind === 'zoomIn' ? .8 : 1.25).add(orbit.target)
    else if (command.kind.startsWith('pan')) {
      const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0), forward = new Vector3().crossVectors(camera.up, right).normalize()
      const delta = (command.kind === 'panLeft' || command.kind === 'panRight' ? right : forward).multiplyScalar(bounds.radius * .12 * (command.kind === 'panLeft' || command.kind === 'panBack' ? -1 : 1))
      orbit.target.add(delta); camera.position.add(delta)
    } else {
      const spherical = new Spherical().setFromVector3(camera.position.clone().sub(orbit.target))
      if (command.kind === 'left') spherical.theta -= Math.PI / 12
      if (command.kind === 'right') spherical.theta += Math.PI / 12
      if (command.kind === 'up') spherical.phi = Math.max(.03, spherical.phi - Math.PI / 18)
      if (command.kind === 'down') spherical.phi = Math.min(Math.PI / 2 - .03, spherical.phi + Math.PI / 18)
      camera.position.copy(orbit.target).add(new Vector3().setFromSpherical(spherical))
    }
    orbit.update(); invalidate()
  }, [command, get, bounds.radius, preset, invalidate])
  return null
}
function Health({ onReady, onLost }: { onReady: () => void; onLost: () => void }) {
  const { gl } = useThree(), first = useRef(true)
  useFrame(() => { if (first.current) { first.current = false; onReady() } })
  useEffect(() => {
    const canvas = gl.domElement, lost = (event: Event) => { event.preventDefault(); onLost() }
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [gl, onLost])
  return null
}
export function Scene3D({ project, cutaway, command, onReady, onLost, onCapture }: { onCapture: (reader: CameraReader | null) => void; project: Project; cutaway: boolean; command: CameraCommand; onReady: () => void; onLost: () => void }) {
  const models = useMemo(() => project.rooms.map(room => buildRoom3D(room, project.openings, project.rooms)), [project.rooms, project.openings])
  const furniture = useMemo(() => buildFurnitureSet3D(project.furniture), [project.furniture])
  const { rooms, furniture: items } = project
  const metrics = useMemo(() => sceneBounds({ rooms, furniture: items }), [rooms, items]), [cx, cy, cz] = metrics.center, [sx, sy, sz] = metrics.size, radius = metrics.radius
  const bounds = useMemo<SceneBounds>(() => ({ center: [cx, cy, cz], size: [sx, sy, sz], radius }), [cx, cy, cz, sx, sy, sz, radius]), extent = Math.max(...bounds.size)
  const get = useThree(state => state.get), invalidate = useThree(state => state.invalidate)
  useLayoutEffect(() => {
    const { gl } = get()
    const previous = gl.shadowMap.autoUpdate
    gl.shadowMap.autoUpdate = false
    return () => { gl.shadowMap.autoUpdate = previous }
  }, [get])
  useLayoutEffect(() => { get().gl.shadowMap.needsUpdate = true; invalidate() }, [get, invalidate, models, furniture])
  return <>
    <color attach="background" args={['#f1f2f7']} />
    <hemisphereLight args={['#ffffff', '#7c7a86', 1.7]} />
    <directionalLight position={[-extent, extent * 1.8, extent]} intensity={2.3} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-extent} shadow-camera-right={extent} shadow-camera-top={extent} shadow-camera-bottom={-extent} shadow-camera-near={.05} shadow-camera-far={extent * 6 + 10} shadow-normalBias={.015} />
    <group position={[-bounds.center[0], 0, -bounds.center[2]]}>{models.map(model => <RoomScene key={model.room.id} model={model} origin={bounds.center} cutaway={cutaway} />)}{furniture.map(model => <FurnitureScene key={model.id} model={model} />)}</group>
    <gridHelper args={[Math.max(8, extent * 2), 20, '#c9ccda', '#e0e2ec']} position={[0, -.085, 0]} />
    <CameraRig bounds={bounds} command={command} initialCamera={project.viewSettings.camera3d} onCapture={onCapture} /><Health onReady={onReady} onLost={onLost} />
  </>
}
