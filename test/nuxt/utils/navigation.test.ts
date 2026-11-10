import { describe, expect, it } from 'vitest'
import { isCoffeePath, isShelfCoffeePath } from '#imports'

describe('isCoffeePath', () => {
  it.each([
    ['/coffees/ayele-fulasa-c1', true],
    ['/shelves/work-work/coffees/ayele-fulasa-c1', true],
    ['/shelves/work-work', false],
    ['/coffees', false],
    ['/roasters/r1', false],
  ])('knows whether %s shows a coffee', (path, expected) => {
    expect(isCoffeePath(path)).toBe(expected)
  })
})

describe('isShelfCoffeePath', () => {
  it.each([
    ['/shelves/work-work/coffees/ayele-fulasa-c1', true],
    ['/coffees/ayele-fulasa-c1', false],
  ])('knows whether %s shows a coffee on a shelf', (path, expected) => {
    expect(isShelfCoffeePath(path)).toBe(expected)
  })
})
