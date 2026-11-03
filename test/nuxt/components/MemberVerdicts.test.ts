import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MemberVerdicts from '~/components/MemberVerdicts.vue'
import { tid } from '../fixtures'

describe('MemberVerdicts', () => {
  it('lists each member with their stars and whether they would buy it again', async () => {
    const verdicts = await mountSuspended(MemberVerdicts, {
      props: {
        verdicts: [
          { userId: 'ana', name: 'Ana', rating: null, wouldBuyAgain: true },
          { userId: 'tom', name: 'Tom', rating: 4, wouldBuyAgain: false },
        ],
      },
    })

    const ana = verdicts.get(tid('member-verdict-ana'))
    const tom = verdicts.get(tid('member-verdict-tom'))

    expect(ana.text()).toContain('Ana')
    expect(ana.text()).toContain('Not yet rated')
    expect(ana.find(tid('member-verdict-buy-again')).exists()).toBe(true)
    expect(tom.get(tid('rating-stars')).attributes('aria-label')).toBe(
      '4 stars',
    )
    expect(tom.find(tid('member-verdict-buy-again')).exists()).toBe(false)
  })

  it('shows nothing when no other member judged the coffee', async () => {
    const verdicts = await mountSuspended(MemberVerdicts, {
      props: { verdicts: [] },
    })

    expect(verdicts.find(tid('member-verdicts')).exists()).toBe(false)
  })
})
