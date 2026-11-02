import type { Purchase } from '#shared/types/purchases'

export type ShelfPurchaseRef = Pick<Purchase, 'shelfId' | 'coffeeId'> & {
  purchaseId: Purchase['id']
}
