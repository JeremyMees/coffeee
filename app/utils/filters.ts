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

export function labelIds(query: Record<string, unknown>) {
  return Object.fromEntries(
    labelledParams.flatMap(param =>
      queryText(query[param]) ? [[param, queryText(query[param])]] : [],
    ),
  ) as Record<string, string>
}

export function pickedOption(
  value: unknown,
  label: string | undefined,
): LibraryOption | null {
  const picked = queryText(value)

  return picked && label ? { value: picked, label } : null
}

export function fixedLabel(labels: Record<string, string>, value: unknown) {
  const picked = queryText(value)

  return Object.hasOwn(labels, picked) ? labels[picked] : undefined
}

export function labelsOf(
  picked: [string, LibraryOption | null][],
): FilterLabels {
  return Object.fromEntries(
    picked.flatMap(([param, option]) =>
      option && (labelledParams as readonly string[]).includes(param)
        ? [[param, option.label]]
        : [],
    ),
  )
}
