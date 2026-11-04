import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { valueUpdater } from '~/utils/shadcn'

describe('valueUpdater', () => {
  it('sets a value', () => {
    const count = ref(1)

    valueUpdater(5, count)

    expect(count.value).toBe(5)
  })

  it('applies an updater to the current value', () => {
    const count = ref(1)

    valueUpdater((old: number) => old + 1, count)

    expect(count.value).toBe(2)
  })
})
