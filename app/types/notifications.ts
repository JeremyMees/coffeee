import type { InternalApi } from 'nitropack/types'

export type ShelfNotification =
  InternalApi['/api/me/notifications']['get'][number]
