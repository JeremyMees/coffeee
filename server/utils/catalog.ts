import type { Viewer } from '#server/types/coffees'

export function canEditCatalogEntry(viewer: Viewer, createdBy: string | null) {
  return viewer.role === 'admin' || viewer.id === createdBy
}
