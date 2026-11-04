import { beforeEach, describe, expect, it } from 'vitest'
import { useBrewMethods } from '~/queries/brew-methods'
import { fakeApi, resetApi } from '../fake-api'
import { runOn } from '../fixtures'
import { brewMethods } from '#test/fixtures/brew-methods'

fakeApi()

beforeEach(resetApi)

describe('useBrewMethods', () => {
  it('fetches the brew methods', async () => {
    const { data, suspense } = await runOn('/', useBrewMethods)

    await suspense()

    expect(data.value).toEqual(brewMethods())
  })
})
