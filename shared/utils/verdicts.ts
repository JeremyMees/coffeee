import type { Verdict } from '../types/verdicts'

export function isFavourite(verdict: Verdict) {
  return verdict.wouldBuyAgain && (verdict.rating ?? 0) >= 4
}

export function ratingLabel(rating: number | null) {
  if (rating === null) return 'Not yet rated'

  return `${rating} ${rating === 1 ? 'star' : 'stars'}`
}

export const ratings = [1, 2, 3, 4, 5] as const
