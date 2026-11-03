import { beforeEach, describe, expect, it } from 'vitest'
import { useMorph } from '#imports'

beforeEach(() => {
  clearNuxtState('coffee-morph')
  clearNuxtState('roaster-morph')
})

describe('useMorph', () => {
  it('names nothing until a coffee is opened', () => {
    expect(useMorph('coffee', 'c1').name('photo')).toBeUndefined()
  })

  it('names the photo and name of the opened coffee only', () => {
    const opened = useMorph('coffee', 'c1')
    const other = useMorph('coffee', 'c2')

    opened.open()

    expect(opened.name('photo')).toEqual({
      viewTransitionName: 'coffee-photo-c1',
      viewTransitionClass: 'coffee-photo',
    })
    expect(opened.name('name')).toEqual({
      viewTransitionName: 'coffee-name-c1',
      viewTransitionClass: 'coffee-name',
    })
    expect(other.name('photo')).toBeUndefined()
  })

  it('moves the names along when another coffee opens', () => {
    const first = useMorph('coffee', 'c1')
    const second = useMorph('coffee', 'c2')

    first.open()
    second.open()

    expect(first.name('name')).toBeUndefined()
    expect(second.name('name')?.viewTransitionName).toBe('coffee-name-c2')
  })

  it('keeps coffees and roasters apart', () => {
    const coffee = useMorph('coffee', 'x1')
    const roaster = useMorph('roaster', 'x1')

    roaster.open()

    expect(coffee.name('name')).toBeUndefined()
    expect(roaster.name('logo')).toEqual({
      viewTransitionName: 'roaster-logo-x1',
      viewTransitionClass: 'roaster-logo',
    })
  })
})
