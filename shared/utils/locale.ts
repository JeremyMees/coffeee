export const fallbackLocale = 'en'

export function pickLocale(preferred: string | undefined) {
  const tags = (preferred ?? '')
    .split(',')
    .map(part => part.split(';')[0]!.trim())
    .filter(tag => tag && tag !== '*')

  for (const tag of tags) {
    try {
      const [supported] = Intl.NumberFormat.supportedLocalesOf(tag)

      if (supported) return supported
    } catch {
      continue
    }
  }

  return fallbackLocale
}

export function formatNumber(
  value: number,
  locale: string,
  options: Intl.NumberFormatOptions = {},
) {
  return new Intl.NumberFormat(locale, options).format(value)
}
