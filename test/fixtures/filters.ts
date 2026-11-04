import type { CatalogFilterKind } from '#shared/types/catalog'
import type { LibraryFilterKind, LibraryOption } from '#shared/types/library'

export const libraryOptions = {
  roasters: [
    { value: 'r1', label: 'La Cabra' },
    { value: 'r2', label: 'Square Mile' },
    { value: 'r3', label: 'Tim Wendelboe' },
  ],
  'flavor-notes': [
    { value: 'n2', label: 'Jasmine' },
    { value: 'n1', label: 'Lime' },
  ],
  origins: [
    { value: 'CO', label: 'Colombia' },
    { value: 'ET', label: 'Ethiopia' },
  ],
} satisfies Record<LibraryFilterKind, LibraryOption[]>

export const catalogOptions = {
  ...libraryOptions,
  'flavor-notes': [
    { value: 'n2', label: 'Jasmine' },
    { value: 'n1', label: 'Lime' },
    { value: 'n3', label: 'Strawberry' },
  ],
  processes: [{ value: 's1', label: 'Washed' }],
  'roast-levels': [
    { value: 'light', label: 'Light' },
    { value: 'medium', label: 'Medium' },
  ],
  'roasted-for': [
    { value: 'espresso', label: 'Espresso' },
    { value: 'filter', label: 'Filter' },
  ],
} satisfies Record<CatalogFilterKind, LibraryOption[]>
