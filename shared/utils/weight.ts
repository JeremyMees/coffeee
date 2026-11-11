import { formatNumber } from './locale'

export function formatWeight(grams: number, locale: string) {
  return grams < 1000
    ? `${formatNumber(grams, locale)} g`
    : `${formatNumber(grams / 1000, locale, { maximumFractionDigits: 1 })} kg`
}
