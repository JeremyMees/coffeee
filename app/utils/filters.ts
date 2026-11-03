export const filterAreas = ['library', 'catalog'] as const

export const filterAreaNames: Record<FilterArea, string> = {
  library: 'your library',
  catalog: 'the catalog',
}

export const filterPlurals: Record<FilterKind, string> = {
  roasters: 'roasters',
  'flavor-notes': 'flavor notes',
  origins: 'origins',
  processes: 'processes',
  'roast-levels': 'roast levels',
  'roasted-for': 'brew styles',
}
