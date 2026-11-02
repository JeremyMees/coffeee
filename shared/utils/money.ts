const euros = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
})

const eurosPerGram = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

export function formatPrice(cents: number) {
  return euros.format(cents / 100)
}

export function formatPricePerGram(centsPerGram: number) {
  return `${eurosPerGram.format(centsPerGram / 100)}/g`
}
