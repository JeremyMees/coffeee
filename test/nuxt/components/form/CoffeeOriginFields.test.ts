import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import CoffeeOriginFields from '~/components/form/CoffeeOriginFields.vue'
import {
  byTestId,
  mountInForm,
  pickOrigin,
  pickScoped,
  tid,
  type,
} from '../../fixtures'
import { scenario, signIn } from '../../server'

beforeEach(async () => {
  const sarah = await scenario.member('Sarah')
  await scenario.coffee(sarah.shelf, {
    origins: ['CO'],
    regions: [{ origin: 'CO', name: 'Huila' }],
    farms: [{ origin: 'CO', name: 'La Palma' }],
  })
  await signIn(sarah)
})

function mountFields(initialValues: Record<string, unknown> = {}) {
  return mountInForm(CoffeeOriginFields, initialValues)
}

describe('CoffeeOriginFields', () => {
  it('fills where it was grown as it is picked', async () => {
    const { wrapper, form } = await mountFields()

    await pickOrigin('colom', 'Colombia')
    await pickScoped('coffee-regions', 'hui', 'Huila')
    await pickScoped('coffee-farms', 'palm', 'La Palma')
    await pickScoped('coffee-washing-stations', 'Tres', 'Add “Tres”')
    await wrapper.get(tid('coffee-altitude-from')).setValue('1700')
    await wrapper.get(tid('coffee-altitude-to')).setValue('2000')
    await flushPromises()

    expect(form.values).toMatchObject({
      origins: ['CO'],
      regions: [{ origin: 'CO', name: 'Huila' }],
      farms: [{ origin: 'CO', name: 'La Palma' }],
      washingStations: [{ origin: 'CO', name: 'Tres' }],
      altitudeFrom: '1700',
      altitudeTo: '2000',
    })
  })

  it('only takes an origin once it is picked', async () => {
    const { form } = await mountFields()

    await type('coffee-origins', 'Colom')

    expect(form.values.origins).toEqual([])
  })

  it('waits for an origin before regions, farms or washing stations can be picked', async () => {
    await mountFields()

    for (const field of [
      'coffee-regions',
      'coffee-farms',
      'coffee-washing-stations',
    ]) {
      expect(byTestId<HTMLInputElement>(field)!.disabled).toBe(true)
    }
  })

  it('drops the regions, farms and washing stations of an origin that is removed', async () => {
    const { form } = await mountFields({
      origins: ['CO', 'ET'],
      regions: [
        { origin: 'CO', name: 'Huila' },
        { origin: 'ET', name: 'Guji' },
      ],
      farms: [{ origin: 'CO', name: 'La Palma' }],
      washingStations: [{ origin: 'ET', name: 'Hambela' }],
    })

    form.setFieldValue('origins', ['ET'])
    await flushPromises()

    expect(form.values).toMatchObject({
      regions: [{ origin: 'ET', name: 'Guji' }],
      farms: [],
      washingStations: [{ origin: 'ET', name: 'Hambela' }],
    })
  })

  it('explains a farm outside the coffee’s origins', async () => {
    const { wrapper, form } = await mountFields({
      origins: ['ET'],
      farms: [{ origin: 'CO', name: 'La Palma' }],
    })

    await form.validate()

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain(
        "Pick farms from the coffee's own origins",
      ),
    )
  })
})
