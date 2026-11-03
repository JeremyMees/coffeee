const kilos = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

export function formatWeight(grams: number) {
  return grams < 1000 ? `${grams} g` : `${kilos.format(grams / 1000)} kg`
}
