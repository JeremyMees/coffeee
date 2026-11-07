import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import OtherGrindSettings from '~/components/molecules/OtherGrindSettings.vue'
import type { OtherGrindSetting } from '#imports'
import { tid } from '../../fixtures'

function other(overrides: Partial<OtherGrindSetting>): OtherGrindSetting {
  return {
    grinderId: 'opus',
    brand: 'Fellow',
    model: 'Opus Gen 2',
    brewMethodId: 'espresso',
    brewMethod: 'Espresso',
    setting: '11',
    userId: 'ana',
    name: 'Ana',
    ownedByShelf: true,
    ...overrides,
  }
}

describe('OtherGrindSettings', () => {
  it('groups other people’s settings by grinder and marks the shelf’s grinders', async () => {
    const settings = await mountSuspended(OtherGrindSettings, {
      props: {
        settings: [
          other({}),
          other({ userId: 'tom', name: 'Tom', setting: '10' }),
          other({
            grinderId: 'c40',
            brand: 'Comandante',
            model: 'C40',
            brewMethodId: 'pour-over',
            brewMethod: 'Pour over',
            setting: '20',
            ownedByShelf: false,
          }),
        ],
      },
    })

    const opus = settings.get(tid('other-grind-grinder-opus'))
    const c40 = settings.get(tid('other-grind-grinder-c40'))

    expect(opus.text()).toContain('Fellow Opus Gen 2')
    expect(opus.find(tid('other-grind-owned')).exists()).toBe(true)
    expect(
      opus.findAll(tid('other-grind-setting')).map(row => row.text()),
    ).toEqual(['Espresso · Ana11', 'Espresso · Tom10'])
    expect(c40.find(tid('other-grind-owned')).exists()).toBe(false)
    expect(c40.get(tid('other-grind-setting-value')).text()).toBe('20')
  })

  it('shows nothing when nobody else saved a setting', async () => {
    const settings = await mountSuspended(OtherGrindSettings, {
      props: { settings: [] },
    })

    expect(settings.find(tid('other-grind-settings')).exists()).toBe(false)
  })
})
