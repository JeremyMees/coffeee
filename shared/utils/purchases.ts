import type { PurchaseRecord } from '../types/purchases'
import { localDate } from './dates'
import { formatAmount } from './money'

function newestFirst<Record extends PurchaseRecord>(purchases: Record[]) {
  return [...purchases].sort((a, b) =>
    b.purchasedOn.localeCompare(a.purchasedOn),
  )
}

function latestPriced(purchases: PurchaseRecord[]) {
  return newestFirst(purchases).find(purchase => purchase.priceCents !== null)
}

export function priceCents(price: number | null) {
  return price === null ? null : Math.round(price * 100)
}

export function lastBought(purchases: PurchaseRecord[]) {
  return newestFirst(purchases)[0]?.purchasedOn ?? null
}

export function latestRoastDate(purchases: PurchaseRecord[]) {
  return (
    newestFirst(purchases).find(purchase => purchase.roastedOn)?.roastedOn ??
    null
  )
}

export function latestPrice(purchases: PurchaseRecord[]) {
  return latestPriced(purchases)?.priceCents ?? null
}

export function pricePerGram(purchases: PurchaseRecord[]) {
  const priced = latestPriced(purchases)

  return priced?.sizeGrams ? priced.priceCents! / priced.sizeGrams : null
}

export function timesBought(purchases: PurchaseRecord[]) {
  return purchases.length
}

export function purchaseFormValues(
  purchase: PurchaseRecord | undefined,
  locale: string,
) {
  return {
    purchasedOn: purchase?.purchasedOn ?? localDate(),
    roastedOn: purchase?.roastedOn ?? '',
    sizeGrams: purchase?.sizeGrams?.toString() ?? '',
    price:
      purchase?.priceCents == null
        ? ''
        : formatAmount(purchase.priceCents, locale),
  }
}

export function buyAgainValues(
  purchases: PurchaseRecord[],
  locale: string,
  today = new Date(),
) {
  const last = newestFirst(purchases)[0]

  return {
    ...purchaseFormValues(last, locale),
    purchasedOn: localDate(today),
    roastedOn: '',
  }
}

export function shelfBags(counts: { bags: number; inStock: number }) {
  if (!counts.bags) return 'Not bought yet'

  const bags = `${counts.bags} ${counts.bags === 1 ? 'bag' : 'bags'}`

  return counts.inStock
    ? `${bags} · ${counts.inStock} in stock`
    : `${bags} · all finished`
}
