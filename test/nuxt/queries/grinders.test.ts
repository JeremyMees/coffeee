import { beforeEach, describe, expect, it } from 'vitest'
import {
  useGrinderDisown,
  useGrinderOwn,
  useShelfGrinders,
} from '~/queries/grinders'
import { listShelfGrinders } from '#server/utils/grinders'
import type { Member } from '#test/support/types'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

async function watching<T>(use: () => T) {
  const { result, grinders } = await runOn('/', () => ({
    result: use(),
    grinders: useShelfGrinders(sarah.shelf.id),
  }))
  await grinders.suspense()

  return { result, shown: () => grinders.data.value }
}

async function shelfGrinders() {
  return listShelfGrinders(await database(), sarah.shelf.id)
}

describe('useShelfGrinders', () => {
  it('fetches the grinders the shelf owns', async () => {
    const opus = await scenario.grinder(sarah.shelf, {
      brand: '1Zpresso',
      model: 'Opus',
    })
    const { data, suspense } = await runOn('/', () =>
      useShelfGrinders(sarah.shelf.id),
    )

    await suspense()

    expect(data.value).toEqual([opus])
  })
})

describe('useGrinderOwn', () => {
  it('adds a grinder and shows it on the shelf', async () => {
    const { result, shown } = await watching(useGrinderOwn)

    await result.mutateAsync({
      shelfId: sarah.shelf.id,
      grinder: { brand: 'Niche', model: 'Zero' },
    })

    expect(await shelfGrinders()).toEqual([
      expect.objectContaining({ brand: 'Niche', model: 'Zero' }),
    ])
    expect(shown()).toEqual([
      expect.objectContaining({ brand: 'Niche', model: 'Zero' }),
    ])
  })
})

describe('useGrinderDisown', () => {
  it('removes a grinder and drops it from the shelf', async () => {
    const opus = await scenario.grinder(sarah.shelf)
    const { result, shown } = await watching(useGrinderDisown)

    await result.mutateAsync({ shelfId: sarah.shelf.id, grinderId: opus.id })

    expect(await shelfGrinders()).toEqual([])
    expect(shown()).toEqual([])
  })
})
