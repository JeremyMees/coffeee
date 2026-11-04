import { describe, expect, it } from 'vitest'
import { isApplePlatform, shortcuts } from '~/utils/shortcuts'

describe('isApplePlatform', () => {
  it('knows Macs, iPhones and iPads', () => {
    expect(isApplePlatform('MacIntel')).toBe(true)
    expect(isApplePlatform('iPad')).toBe(true)
    expect(isApplePlatform('Win32')).toBe(false)
    expect(isApplePlatform('Linux x86_64')).toBe(false)
  })
})

describe('shortcuts', () => {
  it('uses ⌘ on Apple devices and Ctrl elsewhere', () => {
    expect(shortcuts(true)).toEqual([
      { keys: ['⌘', 'K'], label: 'Search the catalog' },
      { keys: ['N'], label: 'Add a coffee' },
    ])
    expect(shortcuts(false)[0]!.keys).toEqual(['Ctrl', 'K'])
  })
})
