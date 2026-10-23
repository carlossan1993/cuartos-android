import type { CatalogItem } from '../domain/types'

const item = (catalogId: string, category: string, width: number, depth: number, height: number, type = catalogId): CatalogItem => ({ catalogId, categoryKey: `furniture.categories.${category}`, labelKey: `furniture.items.${catalogId}`, dimensions: { width, depth, height }, renderer: { kind: 'procedural', type }, resizable: false })
export const FURNITURE_CATALOG: readonly CatalogItem[] = [
  item('bed-single', 'sleep', .9, 1.9, .5), item('bed-double', 'sleep', 1.5, 2, .55),
  item('sofa', 'seating', 2, .85, .85), item('armchair', 'seating', .85, .85, .85, 'sofa'), item('chair', 'seating', .45, .5, .9),
  item('dining-table', 'tables', 1.4, .8, .75, 'table'), item('desk', 'tables', 1.2, .6, .75, 'table'), item('coffee-table', 'tables', 1, .6, .4, 'table'),
  item('nightstand', 'storage', .45, .4, .55, 'storage'), item('wardrobe', 'storage', 1.6, .6, 2, 'storage'), item('bookshelf', 'storage', .8, .3, 1.8, 'storage'), item('tv-unit', 'storage', 1.4, .4, .55, 'storage'),
  item('fridge', 'appliances', .7, .7, 1.8, 'appliance'), item('stove', 'appliances', .6, .6, .9),
  item('sink', 'bath', .6, .5, .85), item('toilet', 'bath', .4, .7, .8),
]
export const catalogItem = (id: string) => FURNITURE_CATALOG.find(item => item.catalogId === id)
