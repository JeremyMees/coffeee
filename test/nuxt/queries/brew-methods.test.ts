import { beforeEach, describe, expect, it } from 'vitest'
import { useBrewMethods } from '~/queries/brew-methods'
import { runOn } from '../fixtures'
import { scenario, signIn } from '../server'

beforeEach(async () => {
  await signIn(await scenario.member('Sarah'))
})

describe('useBrewMethods', () => {
  it('fetches the brew methods in their order', async () => {
    const { data, suspense } = await runOn('/', useBrewMethods)

    await suspense()

    expect(data.value?.map(method => method.name)).toEqual([
      'Espresso',
      'Pour over',
      'AeroPress',
      'Moka pot',
      'French press',
      'Cold brew',
      'Batch brew',
    ])
  })
})
