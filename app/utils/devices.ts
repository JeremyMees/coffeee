export function isIPhone(userAgent: string) {
  return /iPhone|iPod/.test(userAgent)
}

export function isPhone(userAgent: string) {
  return isIPhone(userAgent) || /Android.+Mobile/.test(userAgent)
}

export type NotificationSettingsPlace =
  'iPhoneApp' | 'androidApp' | 'firefox' | 'safari' | 'chromium' | 'other'

export function notificationSettingsPlace(
  userAgent: string,
  installed: boolean,
): NotificationSettingsPlace {
  if (installed && isIPhone(userAgent)) return 'iPhoneApp'
  if (installed && /Android/.test(userAgent)) return 'androidApp'
  if (/Firefox\/|FxiOS/.test(userAgent)) return 'firefox'
  if (/Chrome\/|CriOS|Edg\//.test(userAgent)) return 'chromium'
  if (/Macintosh.+Safari\//.test(userAgent)) return 'safari'

  return 'other'
}
