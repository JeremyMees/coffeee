import { describe, expect, it } from 'vitest'
import { sharedLink } from '~/utils/share'

describe('sharedLink', () => {
  it('uses a shared link as it is', () => {
    expect(sharedLink('https://roaster.example/ayele')).toBe(
      'https://roaster.example/ayele',
    )
  })

  it('finds the first web address inside shared text', () => {
    expect(
      sharedLink(
        'Look at this one: https://roaster.example/ayele?size=250g and http://other.example',
      ),
    ).toBe('https://roaster.example/ayele?size=250g')
  })

  it('leaves the punctuation around a link out', () => {
    expect(sharedLink('Try it (https://roaster.example/ayele).')).toBe(
      'https://roaster.example/ayele',
    )
  })

  it('looks through every part in order', () => {
    expect(
      sharedLink(undefined, 'No link here', 'Ayele https://roaster.example/a'),
    ).toBe('https://roaster.example/a')
  })

  it('finds nothing without a web address', () => {
    expect(sharedLink('Ayele, washed', ['https://x.example'], undefined)).toBe(
      undefined,
    )
    expect(sharedLink('ftp://roaster.example/ayele')).toBe(undefined)
  })
})
