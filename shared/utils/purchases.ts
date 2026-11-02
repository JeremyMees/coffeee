import type { PurchaseRecord } from '../types/purchases'
import { localDate } from './dates'

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

export function purchaseFormValues(purchase: PurchaseRecord | undefined) {
  return {
    purchasedOn: purchase?.purchasedOn ?? localDate(),
    roastedOn: purchase?.roastedOn ?? '',
    sizeGrams: purchase?.sizeGrams?.toString() ?? '',
    price:
      purchase?.priceCents == null
        ? ''
        : (purchase.priceCents / 100).toFixed(2),
  }
}

export function buyAgainValues(
  purchases: PurchaseRecord[],
  today = new Date(),
) {
  const last = newestFirst(purchases)[0]

  return {
    ...purchaseFormValues(last),
    purchasedOn: localDate(today),
    roastedOn: '',
  }
}
