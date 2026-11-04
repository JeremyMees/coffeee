import type { AdminEntry } from '#shared/types/admin'

export function flavorNoteEntries(): AdminEntry[] {
  return [
    { id: 'n1', name: 'Lime', detail: null, detailId: null, uses: 3 },
    { id: 'n2', name: 'Limes', detail: null, detailId: null, uses: 1 },
    { id: 'n3', name: 'Jasmine', detail: null, detailId: null, uses: 0 },
  ]
}

export const otherAdminEntries: Record<string, AdminEntry[]> = {
  coffees: [
    {
      id: 'c1',
      name: 'Ayele Fulasa',
      detail: 'Square Mile',
      detailId: 'r2',
      uses: 2,
    },
  ],
  roasters: [
    { id: 'r2', name: 'Square Mile', detail: null, detailId: null, uses: 1 },
  ],
}
