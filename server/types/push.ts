export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushMessage {
  title: string
  body: string
  path: string
  unread: number
}

export type PushNews = Omit<PushMessage, 'unread'>

export type PushOutcome = 'sent' | 'gone'
