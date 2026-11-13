export function isIPhone(userAgent: string) {
  return /iPhone|iPod/.test(userAgent)
}

export function isPhone(userAgent: string) {
  return isIPhone(userAgent) || /Android.+Mobile/.test(userAgent)
}
