export const catalogPickers = [
  { key: 'flavorNote', kind: 'flavor-notes', param: 'flavorNoteId' },
  { key: 'origin', kind: 'origins', param: 'originCode' },
  { key: 'roaster', kind: 'roasters', param: 'roasterId' },
  { key: 'process', kind: 'processes', param: 'processId' },
  { key: 'varietal', kind: 'varietals', param: 'varietalId' },
  { key: 'roastLevel', kind: 'roast-levels', param: 'roastLevel' },
  { key: 'roastedFor', kind: 'roasted-for', param: 'roastedFor' },
] as const

export const catalogFilterLabels: Record<CatalogFilterKind, string> = {
  'flavor-notes': 'Flavor note',
  origins: 'Origin',
  roasters: 'Roaster',
  processes: 'Process',
  varietals: 'Varietal',
  'roast-levels': 'Roast level',
  'roasted-for': 'Roasted for',
}

export const catalogMatchLabels: Record<CatalogMatchField, string> = {
  name: 'Name',
  roaster: 'Roaster',
  origins: 'Origin',
  regions: 'Region',
  farms: 'Farm',
  washingStations: 'Washing station',
  producers: 'Producer',
  processes: 'Process',
  varietals: 'Varietal',
  flavorNotes: 'Flavor note',
}

export const catalogSortLabels: Record<CatalogSort, string> = {
  newest: 'Newest',
  communityRating: 'Community rating',
}

export function emptyCatalogFilter(): CatalogFilter {
  return {
    mine: false,
    flavorNote: null,
    origin: null,
    roaster: null,
    process: null,
    varietal: null,
    roastLevel: null,
    roastedFor: null,
  }
}

export function isCatalogFiltered(filter: CatalogFilter) {
  return (
    filter.mine || catalogPickers.some(picker => filter[picker.key] !== null)
  )
}

export function catalogQuery(
  search: string,
  filter: CatalogFilter,
  sort: CatalogSort = 'newest',
) {
  const query: Record<string, string> = {}

  if (search.trim()) query.search = search.trim()
  if (filter.mine) query.mine = 'true'
  if (sort !== 'newest') query.sort = sort

  for (const picker of catalogPickers) {
    const picked = filter[picker.key]

    if (picked) query[picker.param] = picked.value
  }

  return query
}

export function catalogRoute(
  search: string,
  filter: CatalogFilter,
  sort: CatalogSort,
) {
  const query = catalogQuery('', filter, sort)

  return search.trim() ? { q: search.trim(), ...query } : query
}

const fixedCatalogLabels: Partial<
  Record<CatalogPicker['param'], Record<string, string>>
> = { roastLevel: roastLevelLabels, roastedFor: roastedForLabels }

export function catalogFromRoute(
  query: Record<string, unknown>,
  labels: FilterLabels,
) {
  const filter = emptyCatalogFilter()
  filter.mine = query.mine === 'true'

  for (const picker of catalogPickers) {
    const fixed = fixedCatalogLabels[picker.param]
    const value = query[picker.param]

    filter[picker.key] = pickedOption(
      value,
      fixed
        ? fixedLabel(fixed, value)
        : labels[picker.param as keyof FilterLabels],
    )
  }

  return {
    search: queryText(query.q),
    filter,
    sort: catalogSorts.find(sort => sort === query.sort) ?? 'newest',
  }
}

export function catalogLabels(filter: CatalogFilter) {
  return labelsOf(
    catalogPickers.map(picker => [picker.param, filter[picker.key]]),
  )
}

export function matchLabels(coffee: Pick<CatalogCoffee, 'matches'>) {
  return coffee.matches
    .filter(match => match.field !== 'name')
    .map(match => `${catalogMatchLabels[match.field]}: ${match.name}`)
}
