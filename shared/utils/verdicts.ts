import type { CommunityRating, Verdict } from '../types/verdicts'

export function isFavourite(verdict: Verdict) {
  return verdict.wouldBuyAgain && (verdict.rating ?? 0) >= 4
}

export function ratingLabel(rating: number | null) {
  if (rating === null) return 'Not yet rated'

  return `${rating} ${rating === 1 ? 'star' : 'stars'}`
}

export function communityRatingLabel(rating: CommunityRating) {
  if (rating.average === null) return 'No ratings yet'

  return `${rating.average.toFixed(1)} from ${rating.raters} ${rating.raters === 1 ? 'person' : 'people'}`
}

export const ratings = [1, 2, 3, 4, 5] as const
