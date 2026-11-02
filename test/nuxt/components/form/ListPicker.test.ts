import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import ListPicker from '~/components/form/ListPicker.vue'
import { nameKey } from '#imports'
import { fakeList } from '../../fake-api'
import {
  byTestId,
  inputValue,
  pickerOptions,
  pickOption,
  type,
} from '../../fixtures'

const known = { processes: [] as { id: string; name: string }[] }
const searches: string[] = []

registerEndpoint('/api/processes', event => {
  searches.push(new URL(event.path, 'http://test').searchParams.get('search')!)

  return fakeList(() => known.processes)(event)
})

beforeEach(() => {
  searches.length = 0
  known.processes = [
    { id: 'p1', name: 'Co fermentation' },
    { id: 'p2', name: 'Washed' },
  ]
})

function mountPicker(props: Record<string, unknown> = {}) {
  return mountSuspended(ListPicker, {
    props: {
      id: 'coffee-process',
      endpoint: '/api/processes',
      placeholder: 'Search or add a process',
      hint: 'Type the process',
      ...props,
    },
    attrs: { 'data-testid': 'process' },
    attachTo: document.body,
  })
}

describe('ListPicker', () => {
  it('starts from the entry already picked', async () => {
    await mountPicker({ modelValue: 'Washed' })

    expect(inputValue('process')).toBe('Washed')
    expect(byTestId('process')!.getAttribute('placeholder')).toBe(
      'Search or add a process',
    )
  })

  it('asks the list for entries similar to what was typed', async () => {
    await mountPicker()

    await type('process', 'co ferm')

    await vi.waitFor(() => {
      expect(searches).toContain('co ferm')
      expect(pickerOptions()).toEqual(['Co fermentation', 'Add “co ferm”'])
    })
  })

  it('waits for typing to pause before asking the list', async () => {
    await mountPicker()

    await type('process', 'w')
    await type('process', 'wa')
    await type('process', 'was')

    await vi.waitFor(() => expect(searches).toContain('was'))
    expect(searches).not.toContain('w')
    expect(searches).not.toContain('wa')
  })

  it('reuses an earlier search instead of asking again', async () => {
    await mountPicker()

    await type('process', 'washed')
    await vi.waitFor(() => expect(pickerOptions()).toEqual(['Washed']))
    await type('process', 'co')
    await vi.waitFor(() => expect(searches).toContain('co'))
    await type('process', 'Washed')
    await vi.waitFor(() => expect(pickerOptions()).toEqual(['Washed']))

    expect(searches.filter(search => nameKey(search) === 'washed')).toEqual([
      'washed',
    ])
  })

  it('offers to add an entry only when none has that name', async () => {
    await mountPicker()

    await type('process', 'WASHED')
    await vi.waitFor(() => expect(pickerOptions()).toEqual(['Washed']))

    await type('process', 'Koji')
    await vi.waitFor(() => expect(pickerOptions()).toEqual(['Add “Koji”']))
  })

  it('gives the entry that was picked', async () => {
    const picker = await mountPicker()

    await type('process', 'co ferm')
    await pickOption('Co fermentation')

    expect(picker.emitted('update:modelValue')).toEqual([['Co fermentation']])
  })

  it('gives a new entry by the name typed', async () => {
    const picker = await mountPicker()

    await type('process', '  Koji ')
    await pickOption('Add “Koji”')

    expect(picker.emitted('update:modelValue')).toEqual([['Koji']])
  })

  it('shows its hint while the list is empty', async () => {
    known.processes = []
    await mountPicker()

    await type('process', '')

    await vi.waitFor(() =>
      expect(byTestId('list-hint')!.textContent?.trim()).toBe(
        'Type the process',
      ),
    )
  })

  it('is marked invalid when its field has an error', async () => {
    await mountPicker({ invalid: true })

    expect(byTestId('process')!.getAttribute('aria-invalid')).toBe('true')
  })
})
