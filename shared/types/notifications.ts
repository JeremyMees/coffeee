import type { notificationKinds } from '../utils/notifications'

export type NotificationKind = (typeof notificationKinds)[number]

export type InviteStatus = 'pending' | 'accepted' | 'expired'
