export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushMessage {
  title: string
  body: string
  path: string
}

export type PushOutcome = 'sent' | 'gone'
