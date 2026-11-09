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
  varietals: 'varietals',
  'roast-levels': 'roast levels',
  'roasted-for': 'brew styles',
}

export const labelledParams = [
  'roasterId',
  'flavorNoteId',
  'originCode',
  'processId',
  'varietalId',
] as const

export function queryText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export function queryValues(value: unknown) {
  const values = (Array.isArray(value) ? value : [value]).filter(
    (picked): picked is string => typeof picked === 'string' && picked !== '',
  )

  return [...new Set(values)]
}

export function labelIds(query: Record<string, unknown>) {
  return Object.fromEntries(
    labelledParams.flatMap(param => {
      const ids = queryValues(query[param])

      return ids.length ? [[param, ids]] : []
    }),
  ) as Record<string, string[]>
}

export function pickedOptions(
  value: unknown,
  labels: Record<string, string> | undefined,
): LibraryOption[] {
  if (!labels)
    return queryValues(value).map(picked => ({ value: picked, label: '' }))

  return queryValues(value).flatMap(picked =>
    Object.hasOwn(labels, picked)
      ? [{ value: picked, label: labels[picked]! }]
      : [],
  )
}

export function labelsOf(picked: [string, LibraryOption[]][]): FilterLabels {
  return Object.fromEntries(
    picked.flatMap(([param, options]) =>
      options.length && (labelledParams as readonly string[]).includes(param)
        ? [
            [
              param,
              Object.fromEntries(
                options.map(option => [option.value, option.label]),
              ),
            ],
          ]
        : [],
    ),
  )
}
