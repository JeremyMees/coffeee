import { describe, expect, it } from 'vitest'
import { grinderName } from '#shared/utils/grinders'

describe('grinderName', () => {
  it('names a grinder by its brand and model', () => {
    expect(grinderName({ brand: 'Fellow', model: 'Opus Gen 2' })).toBe(
      'Fellow Opus Gen 2',
    )
  })
})
