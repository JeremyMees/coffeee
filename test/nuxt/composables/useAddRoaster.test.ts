import { describe, expect, it } from 'vitest'
import { useAddRoaster } from '#imports'

describe('useAddRoaster', () => {
  it('is closed until something opens it', () => {
    clearNuxtState('add-roaster-open')

    expect(useAddRoaster().value).toBe(false)
  })

  it('is one sheet shared by every caller', () => {
    useAddRoaster().value = true

    expect(useAddRoaster().value).toBe(true)
  })
})
