import type {
  InviteStatus,
  NotificationKind,
} from '#shared/types/notifications'

export function notifications() {
  return [
    {
      id: 'n1',
      kind: 'coffeeAdded' as NotificationKind,
      actor: 'Tom' as string | null,
      shelfId: 'home',
      shelf: "Sarah's shelf",
      coffeeId: 'c1' as string | null,
      coffee: 'Ayele Fulasa' as string | null,
      inviteId: null as string | null,
      inviteStatus: null as InviteStatus | null,
      createdAt: '2026-11-02T10:00:00.000Z',
      readAt: null as string | null,
    },
    {
      id: 'n2',
      kind: 'memberJoined' as NotificationKind,
      actor: 'Tom' as string | null,
      shelfId: 'home',
      shelf: "Sarah's shelf",
      coffeeId: null as string | null,
      coffee: null as string | null,
      inviteId: null as string | null,
      inviteStatus: null as InviteStatus | null,
      createdAt: '2026-11-01T10:00:00.000Z',
      readAt: '2026-11-01T12:00:00.000Z' as string | null,
    },
  ]
}

export function inviteNotification(
  overrides: Partial<ReturnType<typeof notifications>[number]> = {},
) {
  return {
    ...notifications()[0]!,
    id: 'n3',
    kind: 'invited' as NotificationKind,
    shelfId: 'office',
    shelf: 'Office',
    coffeeId: null,
    coffee: null,
    inviteId: 'mi1',
    inviteStatus: 'pending' as InviteStatus | null,
    ...overrides,
  }
}
