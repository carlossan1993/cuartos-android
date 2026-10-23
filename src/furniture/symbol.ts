export interface SymbolPart { shape: 'rect' | 'ellipse'; x: number; y: number; width: number; height: number; fill: string }
const rect = (x: number, y: number, width: number, height: number, fill: string): SymbolPart => ({ shape: 'rect', x, y, width, height, fill })
const ellipse = (x: number, y: number, width: number, height: number, fill: string): SymbolPart => ({ ...rect(x, y, width, height, fill), shape: 'ellipse' })
/** Normalized top views shared by the catalog thumbnail and the canvas. */
export function furnitureSymbol(type: string): readonly SymbolPart[] {
  const base = rect(0, 0, 1, 1, '#e7e8ed')
  if (type.startsWith('bed-')) return [base, rect(.04, .03, .92, .08, '#8a6853'), rect(.07, .16, .86, .76, '#718571'), ...(type === 'bed-double' ? [rect(.1, .12, .35, .2, '#ffffff'), rect(.55, .12, .35, .2, '#ffffff')] : [rect(.15, .12, .7, .2, '#ffffff')])]
  if (type === 'sofa') return [base, rect(.02, .02, .96, .23, '#536574'), rect(.02, .15, .12, .82, '#536574'), rect(.86, .15, .12, .82, '#536574'), rect(.17, .29, .31, .62, '#a6b2bc'), rect(.52, .29, .31, .62, '#a6b2bc')]
  if (type === 'chair') return [base, rect(.06, .04, .88, .2, '#718571'), rect(.12, .3, .76, .62, '#b4c0ae')]
  if (type === 'table') return [rect(0, 0, 1, 1, '#c39a68'), rect(.07, .12, .86, .76, '#ddbd91')]
  if (type === 'storage') return [rect(0, 0, 1, 1, '#c39a68'), rect(.04, .08, .44, .84, '#ddbd91'), rect(.52, .08, .44, .84, '#ddbd91')]
  if (type === 'appliance') return [base, rect(.06, .08, .88, .84, '#ffffff'), rect(.1, .75, .8, .08, '#9aa4ac')]
  if (type === 'stove') return [base, ...[.27, .73].flatMap(x => [.27, .73].map(y => ellipse(x - .15, y - .15, .3, .3, '#536574')))]
  if (type === 'sink') return [base, ellipse(.12, .18, .76, .7, '#ffffff'), rect(.44, .04, .12, .22, '#536574')]
  if (type === 'toilet') return [rect(.06, .03, .88, .28, '#ffffff'), ellipse(.12, .28, .76, .7, '#ffffff'), ellipse(.3, .43, .4, .36, '#a6c5cf')]
  return [base, rect(.15, .45, .7, .1, '#9aa4ac'), rect(.45, .15, .1, .7, '#9aa4ac')]
}
