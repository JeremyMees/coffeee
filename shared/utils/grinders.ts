export function grinderName(grinder: { brand: string; model: string }) {
  return `${grinder.brand} ${grinder.model}`
}

export function groupedByGrinder<Setting extends { grinderId: string }>(
  settings: Setting[],
) {
  const groups = new Map<string, Setting[]>()

  for (const setting of settings) {
    groups.set(setting.grinderId, [
      ...(groups.get(setting.grinderId) ?? []),
      setting,
    ])
  }

  return [...groups.values()]
}
