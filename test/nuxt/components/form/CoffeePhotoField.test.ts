import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeePhotoField from '~/components/form/CoffeePhotoField.vue'
import { tid } from '../../fixtures'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:bag')
  URL.revokeObjectURL = vi.fn()
})

function mountField(props: {
  currentUrl?: string | null
  modelValue?: File | null
}) {
  return mountSuspended(CoffeePhotoField, {
    props: {
      prefix: 'coffee-form',
      'onUpdate:modelValue': (value: File | null | undefined) =>
        field.setProps({ modelValue: value }),
      ...props,
    },
  })
}

let field: Awaited<ReturnType<typeof mountField>>

async function choose(file = new File(['bag'], 'bag.png')) {
  const input = field.get(tid('coffee-form-photo-input'))
  Object.defineProperty(input.element, 'files', {
    value: [file],
    configurable: true,
  })
  await input.trigger('change')

  return file
}

function preview() {
  return field.find(tid('coffee-form-photo-preview'))
}

describe('CoffeePhotoField', () => {
  it('offers to add a photo when the coffee has none', async () => {
    field = await mountField({})

    expect(preview().exists()).toBe(false)
    expect(field.get(tid('coffee-form-photo-pick')).text()).toBe('Add photo')
    expect(field.find(tid('coffee-form-photo-remove')).exists()).toBe(false)
  })

  it('shows the current photo and offers to replace it', async () => {
    field = await mountField({ currentUrl: '/api/photos/coffees/bag.webp' })

    expect(preview().attributes('src')).toBe('/api/photos/coffees/bag.webp')
    expect(field.get(tid('coffee-form-photo-pick')).text()).toBe(
      'Replace photo',
    )
  })

  it('picks a photo and previews it', async () => {
    field = await mountField({})

    const file = await choose()

    expect(field.emitted('update:modelValue')).toEqual([[file]])
    expect(preview().attributes('src')).toBe('blob:bag')
  })

  it('forgets a picked photo when there was none before', async () => {
    field = await mountField({})
    await choose()

    await field.get(tid('coffee-form-photo-remove')).trigger('click')

    expect(field.emitted('update:modelValue')!.at(-1)).toEqual([undefined])
    expect(preview().exists()).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:bag')
  })

  it('marks the current photo for removal', async () => {
    field = await mountField({ currentUrl: '/api/photos/coffees/bag.webp' })

    await field.get(tid('coffee-form-photo-remove')).trigger('click')

    expect(field.emitted('update:modelValue')).toEqual([[null]])
    expect(preview().exists()).toBe(false)
    expect(field.get(tid('coffee-form-photo-pick')).text()).toBe('Add photo')
  })
})
