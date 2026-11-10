export function emptyRoasterFilter(): RoasterFilter {
  return { country: [], boughtFrom: false }
}

export function isRoasterFiltered(filter: RoasterFilter) {
  return filter.boughtFrom || filter.country.length > 0
}

export function roasterQuery(search: string, filter: RoasterFilter) {
  const query: RoasterQuery = {}
  const countries = filter.country.map(option => option.value)

  if (search.trim()) query.search = search.trim()
  if (countries.length === 1) query.countryCode = countries[0]!
  else if (countries.length) query.countryCode = countries
  if (filter.boughtFrom) query.boughtFrom = 'true'

  return query
}

export function roasterRoute(search: string, filter: RoasterFilter) {
  const { search: searched, ...query } = roasterQuery(search, filter)

  return searched ? { q: searched, ...query } : query
}

export function roasterFromRoute(query: Record<string, unknown>) {
  return {
    search: queryText(query.q),
    filter: {
      country: queryValues(query.countryCode)
        .filter(isOriginCode)
        .map(code => ({ value: code, label: originName(code) })),
      boughtFrom: query.boughtFrom === 'true',
    },
  }
}
