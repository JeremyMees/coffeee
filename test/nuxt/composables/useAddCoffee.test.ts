import { describe, expect, it } from 'vitest'
import { useAddCoffee } from '#imports'

describe('useAddCoffee', () => {
  it('is closed until something opens it', () => {
    clearNuxtState('add-coffee-open')

    expect(useAddCoffee().value).toBe(false)
  })

  it('is one sheet shared by every caller', () => {
    useAddCoffee().value = true

    expect(useAddCoffee().value).toBe(true)
  })
})
