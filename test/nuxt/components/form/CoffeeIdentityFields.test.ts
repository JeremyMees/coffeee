import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import CoffeeIdentityFields from '~/components/form/CoffeeIdentityFields.vue'
import { mountInForm, pickRoaster, tid } from '../../fixtures'
import { scenario, signIn } from '../../server'

beforeEach(async () => {
  const sarah = await scenario.member('Sarah')
  await scenario.roaster(sarah, 'Square Mile')
  await signIn(sarah)
})

describe('CoffeeIdentityFields', () => {
  it('asks for the name and roaster, which are required, and the link', async () => {
    const { wrapper } = await mountInForm(CoffeeIdentityFields)

    expect(
      wrapper.findAll('label').map(label => label.text().replace(/\s+/g, ' ')),
    ).toEqual(['Coffee * (required)', 'Roaster * (required)', 'Link'])
  })

  it('fills the name, roaster and link as they are entered', async () => {
    const { wrapper, form } = await mountInForm(CoffeeIdentityFields)

    await wrapper.get(tid('coffee-name')).setValue('Halo')
    await pickRoaster('square', 'Square Mile')
    await wrapper.get(tid('coffee-link')).setValue('https://example.com')
    await flushPromises()

    expect(form.values).toMatchObject({
      name: 'Halo',
      roaster: 'Square Mile',
      link: 'https://example.com',
    })
  })
})
