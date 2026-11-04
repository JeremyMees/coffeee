import { describe, expect, it } from 'vitest'
import {
  fixedLabel,
  labelIds,
  labelsOf,
  pickedOption,
  queryText,
} from '~/utils/filters'

describe('queryText', () => {
  it('reads a single value and ignores the rest', () => {
    expect(queryText('lime')).toBe('lime')
    expect(queryText(['lime', 'jasmine'])).toBe('')
    expect(queryText(null)).toBe('')
    expect(queryText(undefined)).toBe('')
  })
})

describe('labelIds', () => {
  it('picks the filters that need a name looked up', () => {
    expect(
      labelIds({
        q: 'lime',
        roasterId: 'r1',
        originCode: 'ET',
        processId: '',
        roastLevel: 'light',
      }),
    ).toEqual({ roasterId: 'r1', originCode: 'ET' })
  })
})

describe('pickedOption', () => {
  it('needs both a value and its name', () => {
    expect(pickedOption('r1', 'La Cabra')).toEqual({
      value: 'r1',
      label: 'La Cabra',
    })
    expect(pickedOption('r1', undefined)).toBeNull()
    expect(pickedOption('', 'La Cabra')).toBeNull()
  })
})

describe('fixedLabel', () => {
  it('names a known value only', () => {
    const labels = { light: 'Light' }

    expect(fixedLabel(labels, 'light')).toBe('Light')
    expect(fixedLabel(labels, 'burnt')).toBeUndefined()
    expect(fixedLabel(labels, 'toString')).toBeUndefined()
  })
})

describe('labelsOf', () => {
  it('keeps the names of picked filters that need looking up', () => {
    expect(
      labelsOf([
        ['roasterId', { value: 'r1', label: 'La Cabra' }],
        ['originCode', null],
        ['roastLevel', { value: 'light', label: 'Light' }],
      ]),
    ).toEqual({ roasterId: 'La Cabra' })
  })
})
