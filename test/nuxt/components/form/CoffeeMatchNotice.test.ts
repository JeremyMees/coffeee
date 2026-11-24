import { beforeEach, describe, expect, it, vi } from 'vitest'
import CoffeeMatchNotice from '~/components/form/CoffeeMatchNotice.vue'
import type { Member } from '#test/support/types'
import { byTestId, mountInForm } from '../../fixtures'
import { scenario, signIn } from '../../server'

let sarah: Member
let tom: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
  await signIn(sarah)
})

async function mountNotice(name: string, roaster: string) {
  const mounted = await mountInForm(
    CoffeeMatchNotice,
    { name, roaster },
    { shelfId: sarah.shelf.id },
  )

  return mounted
}

function noticeText() {
  const notice = byTestId('coffee-match')!
  const part = (slot: string) =>
    notice
      .querySelector(`[data-slot="${slot}"]`)
      ?.textContent?.replace(/\s+/g, ' ')
      .trim()

  return {
    title: part('alert-title'),
    body: part('alert-description'),
    action: byTestId('coffee-match-pick')!.textContent?.trim(),
  }
}

describe('CoffeeMatchNotice', () => {
  it('says a coffee is already in the catalog, whatever its spelling', async () => {
    await scenario.coffee(tom.shelf)

    await mountNotice('ayele-fulasa', 'square mile')

    await vi.waitFor(() => expect(byTestId('coffee-match')).not.toBeNull())
    expect(noticeText()).toEqual({
      title: 'Already in the catalog',
      body: 'Ayele Fulasa by Square Mile is already in the catalog, so there’s no need to fill in its details. Just add your bag.',
      action: 'Add a bag',
    })
  })

  it('asks whether a coffee still in stock was bought again', async () => {
    await scenario.coffee(sarah.shelf)

    await mountNotice('Ayele Fulasa', 'Square Mile')

    await vi.waitFor(() => expect(byTestId('coffee-match')).not.toBeNull())
    expect(noticeText()).toEqual({
      title: 'Already on your shelf',
      body: 'Ayele Fulasa by Square Mile is still in stock. Bought another bag?',
      action: 'Add another bag',
    })
  })

  it('remembers a coffee the shelf finished before', async () => {
    const { id } = await scenario.coffee(sarah.shelf)
    await scenario.finishBag(sarah.shelf, id)

    await mountNotice('Ayele Fulasa', 'Square Mile')

    await vi.waitFor(() => expect(byTestId('coffee-match')).not.toBeNull())
    expect(noticeText()).toEqual({
      title: 'You’ve had this one before',
      body: 'Ayele Fulasa by Square Mile is already on this shelf. Add your new bag to it.',
      action: 'Add a bag',
    })
  })

  it('says nothing about a new coffee', async () => {
    await scenario.coffee(tom.shelf)

    await mountNotice('Halo', 'Square Mile')
    await new Promise(resolve => setTimeout(resolve, 600))

    expect(byTestId('coffee-match')).toBeNull()
  })

  it('hands over the coffee when asked to add a bag', async () => {
    const { id } = await scenario.coffee(tom.shelf)
    const { wrapper } = await mountNotice('Ayele Fulasa', 'Square Mile')

    await vi.waitFor(() => expect(byTestId('coffee-match-pick')).not.toBeNull())
    byTestId('coffee-match-pick')!.click()

    const notice = wrapper.findComponent(CoffeeMatchNotice)
    expect(notice.emitted('pick')).toEqual([
      [expect.objectContaining({ id, name: 'Ayele Fulasa', onShelf: false })],
    ])
  })
})
