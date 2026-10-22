export const SCHEMA_VERSION = 1 as const

export type Point = Readonly<{ x: number; y: number }>
export type WorldPoint = Readonly<{ x: number; y: number; z: number }>
export type Vertex = Point & Readonly<{ id: string }>
export type Dimensions = Readonly<{ width: number; depth: number; height: number }>
export type SurfaceMaterial = Readonly<{ color: string; textureId?: string }>

export interface Room {
  readonly id: string
  readonly name: string
  readonly polygon: readonly Vertex[]
  readonly height: number
  readonly wallThickness: number
  readonly floorMaterial: SurfaceMaterial
  readonly wallMaterials: Readonly<Record<string, SurfaceMaterial>>
}

export interface Opening {
  readonly id: string
  readonly roomId: string
  readonly type: 'door' | 'window'
  readonly wallId: string
  readonly offset: number
  readonly width: number
  readonly height: number
  readonly sillHeight: number
}

export interface FurnitureItem {
  readonly id: string
  readonly roomId: string
  readonly catalogId: string
  readonly position: Point
  /** Degrees clockwise in plan X/Y; normalized to [0, 360). */
  readonly rotation: number
  readonly dimensions: Dimensions
  readonly materialOverrides: Readonly<Record<string, SurfaceMaterial>>
}

export interface CatalogItem {
  readonly catalogId: string
  readonly categoryKey: string
  readonly labelKey: string
  readonly dimensions: Dimensions
  readonly renderer: Readonly<{ kind: 'procedural'; type: string }>
  readonly thumbnailId?: string
  readonly resizable: boolean
}

export interface ViewSettings {
  readonly grid: boolean
  readonly snap: boolean
  readonly gridSize: number
  readonly zoom2d: number
  readonly camera3d: Readonly<{ position: WorldPoint; target: WorldPoint }>
}

export interface Project {
  readonly id: string
  readonly name: string
  readonly schemaVersion: typeof SCHEMA_VERSION
  readonly createdAt: string
  readonly updatedAt: string
  readonly languageMetadata: Readonly<{ createdWith: 'es' | 'en' }>
  readonly rooms: readonly Room[]
  readonly openings: readonly Opening[]
  readonly furniture: readonly FurnitureItem[]
  readonly viewSettings: ViewSettings
}
