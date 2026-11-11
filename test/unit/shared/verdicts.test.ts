import { describe, expect, it } from 'vitest'
import {
  communityRatingLabel,
  isFavourite,
  ratingLabel,
  ratings,
} from '#shared/utils/verdicts'

describe('isFavourite', () => {
  it('is a coffee rated four or five stars that would be bought again', () => {
    expect(isFavourite({ rating: 4, wouldBuyAgain: true })).toBe(true)
    expect(isFavourite({ rating: 5, wouldBuyAgain: true })).toBe(true)
  })

  it('leaves out a great coffee nobody would buy again', () => {
    expect(isFavourite({ rating: 5, wouldBuyAgain: false })).toBe(false)
  })

  it('leaves out coffees rated three stars or fewer', () => {
    for (const rating of [1, 2, 3]) {
      expect(isFavourite({ rating, wouldBuyAgain: true })).toBe(false)
    }
  })

  it('leaves out a coffee that is not yet rated', () => {
    expect(isFavourite({ rating: null, wouldBuyAgain: true })).toBe(false)
  })
})

describe('ratingLabel', () => {
  it('names the stars, or says it is not yet rated', () => {
    expect(ratingLabel(null)).toBe('Not yet rated')
    expect(ratingLabel(1)).toBe('1 star')
    expect(ratingLabel(4)).toBe('4 stars')
  })
})

describe('communityRatingLabel', () => {
  it('gives the average to one decimal and how many people rated it', () => {
    expect(communityRatingLabel({ average: 4.25, raters: 4 }, 'en')).toBe(
      '4.3 from 4 people',
    )
    expect(communityRatingLabel({ average: 3, raters: 1 }, 'en')).toBe(
      '3.0 from 1 person',
    )
  })

  it('writes the average the way the locale does', () => {
    expect(communityRatingLabel({ average: 4.25, raters: 4 }, 'nl-BE')).toBe(
      '4,3 from 4 people',
    )
  })

  it('says when nobody rated the coffee yet', () => {
    expect(communityRatingLabel({ average: null, raters: 0 }, 'en')).toBe(
      'No ratings yet',
    )
  })
})

describe('ratings', () => {
  it('runs from one to five stars', () => {
    expect(ratings).toEqual([1, 2, 3, 4, 5])
  })
})
