import { describe, expect, it } from 'vitest'
import {
  labelIds,
  labelsOf,
  pickedOptions,
  queryText,
  queryValues,
} from '~/utils/filters'

describe('queryText', () => {
  it('reads a single value and ignores the rest', () => {
    expect(queryText('lime')).toBe('lime')
    expect(queryText(['lime', 'jasmine'])).toBe('')
    expect(queryText(null)).toBe('')
    expect(queryText(undefined)).toBe('')
  })
})

describe('queryValues', () => {
  it('reads one value or several, once each, skipping blanks', () => {
    expect(queryValues('lime')).toEqual(['lime'])
    expect(queryValues(['lime', '', 'jasmine', 'lime'])).toEqual([
      'lime',
      'jasmine',
    ])
    expect(queryValues(null)).toEqual([])
    expect(queryValues(undefined)).toEqual([])
    expect(queryValues([null, 3])).toEqual([])
  })
})

describe('labelIds', () => {
  it('picks the filters that need a name looked up, with every id', () => {
    expect(
      labelIds({
        q: 'lime',
        roasterId: 'r1',
        flavorNoteId: ['n1', 'n2'],
        originCode: 'ET',
        processId: '',
        roastLevel: 'light',
      }),
    ).toEqual({
      roasterId: ['r1'],
      flavorNoteId: ['n1', 'n2'],
      originCode: ['ET'],
    })
  })
})

describe('pickedOptions', () => {
  it('keeps each value it has a name for', () => {
    const labels = { n1: 'Lime', n2: 'Jasmine' }

    expect(pickedOptions(['n1', 'gone', 'n2'], labels)).toEqual([
      { value: 'n1', label: 'Lime' },
      { value: 'n2', label: 'Jasmine' },
    ])
    expect(pickedOptions('n1', labels)).toEqual([
      { value: 'n1', label: 'Lime' },
    ])
    expect(pickedOptions('n1', undefined)).toEqual([])
    expect(pickedOptions('toString', labels)).toEqual([])
  })
})

describe('labelsOf', () => {
  it('keeps the names of picked filters that need looking up', () => {
    expect(
      labelsOf([
        [
          'flavorNoteId',
          [
            { value: 'n1', label: 'Lime' },
            { value: 'n2', label: 'Jasmine' },
          ],
        ],
        ['originCode', []],
        ['roastLevel', [{ value: 'light', label: 'Light' }]],
      ]),
    ).toEqual({ flavorNoteId: { n1: 'Lime', n2: 'Jasmine' } })
  })
})
