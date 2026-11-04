import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MatchedBy from '~/components/MatchedBy.vue'
import { tid } from '../fixtures'

function matched(matches: CatalogMatch[]) {
  return mountSuspended(MatchedBy, { props: { matches, testid: 'result' } })
}

describe('MatchedBy', () => {
  it('says what matched, leaving out the name', async () => {
    const wrapper = await matched([
      { field: 'name', name: 'Geisha Lot' },
      { field: 'varietals', name: 'Geisha' },
    ])

    expect(
      wrapper.findAll(tid('result-match')).map(match => match.text()),
    ).toEqual(['Varietal: Geisha'])
  })

  it('shows nothing when only the name matched', async () => {
    const wrapper = await matched([{ field: 'name', name: 'Geisha Lot' }])

    expect(wrapper.find(tid('result-matches')).exists()).toBe(false)
  })
})
