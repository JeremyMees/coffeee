import { formatNumber } from './locale'

export function formatPrice(cents: number, locale: string) {
  return formatNumber(cents / 100, locale, {
    style: 'currency',
    currency: 'EUR',
  })
}

export function formatPricePerGram(centsPerGram: number, locale: string) {
  return `${formatNumber(centsPerGram / 100, locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}/g`
}

export function formatAmount(cents: number, locale: string) {
  return formatNumber(cents / 100, locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  })
}
