export const browsingPickers = [
  { key: 'flavorNote', kind: 'flavor-notes', param: 'flavorNoteId' },
  { key: 'origin', kind: 'origins', param: 'originCode' },
  { key: 'roaster', kind: 'roasters', param: 'roasterId' },
  { key: 'process', kind: 'processes', param: 'processId' },
  { key: 'varietal', kind: 'varietals', param: 'varietalId' },
  { key: 'roastLevel', kind: 'roast-levels', param: 'roastLevel' },
  { key: 'roastedFor', kind: 'roasted-for', param: 'roastedFor' },
] as const

export const browsingFilterLabels: Record<BrowsingFilterKind, string> = {
  'flavor-notes': 'Flavor note',
  origins: 'Origin',
  roasters: 'Roaster',
  processes: 'Process',
  varietals: 'Varietal',
  'roast-levels': 'Roast level',
  'roasted-for': 'Roasted for',
}

export const browsingMatchLabels: Record<CatalogMatchField, string> = {
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

const fixedLabels: Partial<
  Record<BrowsingPicker['param'], Record<string, string>>
> = { roastLevel: roastLevelLabels, roastedFor: roastedForLabels }

export function emptyBrowsingFilter(): BrowsingFilter {
  return {
    flavorNote: null,
    origin: null,
    roaster: null,
    process: null,
    varietal: null,
    roastLevel: null,
    roastedFor: null,
  }
}

export function isBrowsingFiltered(filter: BrowsingFilter) {
  return browsingPickers.some(picker => filter[picker.key] !== null)
}

export function browsingQuery(search: string, filter: BrowsingFilter) {
  const query: Record<string, string> = {}

  if (search.trim()) query.search = search.trim()

  for (const picker of browsingPickers) {
    const picked = filter[picker.key]

    if (picked) query[picker.param] = picked.value
  }

  return query
}

export function browsingRoute(search: string, filter: BrowsingFilter) {
  const { search: searched, ...query } = browsingQuery(search, filter)

  return searched ? { q: searched, ...query } : query
}

export function browsingFromRoute(
  query: Record<string, unknown>,
  labels: FilterLabels,
) {
  const filter = emptyBrowsingFilter()

  for (const picker of browsingPickers) {
    const fixed = fixedLabels[picker.param]
    const value = query[picker.param]

    filter[picker.key] = pickedOption(
      value,
      fixed
        ? fixedLabel(fixed, value)
        : labels[picker.param as keyof FilterLabels],
    )
  }

  return { search: queryText(query.q), filter }
}

export function browsingLabels(filter: BrowsingFilter) {
  return labelsOf(
    browsingPickers.map(picker => [picker.param, filter[picker.key]]),
  )
}

export function matchLabels(coffee: { matches: CatalogMatch[] }) {
  return coffee.matches
    .filter(match => match.field !== 'name')
    .map(match => `${browsingMatchLabels[match.field]}: ${match.name}`)
}
