export function localDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

export function formatDate(isoDate: string, locale: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDayMonth(timestamp: string, locale: string) {
  return new Date(timestamp).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  })
}

export function formatDateTime(timestamp: string, locale: string) {
  return new Date(timestamp).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
