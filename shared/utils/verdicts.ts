import type { CommunityRating, Verdict } from '../types/verdicts'
import { formatNumber } from './locale'

export function isFavourite(verdict: Verdict) {
  return verdict.wouldBuyAgain && (verdict.rating ?? 0) >= 4
}

export function ratingLabel(rating: number | null) {
  if (rating === null) return 'Not yet rated'

  return `${rating} ${rating === 1 ? 'star' : 'stars'}`
}

export function formatRating(rating: number, locale: string) {
  return formatNumber(rating, locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

export function communityRatingLabel(rating: CommunityRating, locale: string) {
  if (rating.average === null) return 'No ratings yet'

  return `${formatRating(rating.average, locale)} from ${rating.raters} ${rating.raters === 1 ? 'person' : 'people'}`
}

export const ratings = [1, 2, 3, 4, 5] as const
