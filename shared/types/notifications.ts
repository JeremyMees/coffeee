import type {
  notificationKinds,
  optionalEmailKinds,
} from '../utils/notifications'

export type NotificationKind = (typeof notificationKinds)[number]

export type OptionalEmailKind = (typeof optionalEmailKinds)[number]

export type InviteStatus = 'pending' | 'accepted' | 'expired'
