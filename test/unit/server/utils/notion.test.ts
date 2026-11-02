import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  firstFileUrl,
  isChecked,
  numberOf,
  plainText,
  queryNotionDatabase,
  relatedIds,
  selectedName,
  selectedNames,
} from '#server/utils/notion'

afterEach(() => {
  vi.unstubAllGlobals()
})

function page(id: string) {
  return {
    id,
    created_time: '2026-01-01T10:00:00.000Z',
    last_edited_time: '2026-01-02T10:00:00.000Z',
    properties: {},
  }
}

describe('querying a Notion database', () => {
  it('follows the cursor until every page is read', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          results: [page('a')],
          has_more: true,
          next_cursor: 'next',
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          results: [page('b')],
          has_more: false,
          next_cursor: null,
        }),
      )
    vi.stubGlobal('fetch', fetch)

    const pages = await queryNotionDatabase('secret', 'database')

    expect(pages.map(found => found.id)).toEqual(['a', 'b'])
    expect(fetch).toHaveBeenCalledWith(
      'https://api.notion.com/v1/databases/database/query',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      }),
    )
    expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({ page_size: 100 })
    expect(JSON.parse(fetch.mock.calls[1]![1].body)).toEqual({
      page_size: 100,
      start_cursor: 'next',
    })
  })

  it('says what Notion answered when it refuses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('unauthorized', { status: 401 })),
    )

    await expect(queryNotionDatabase('wrong', 'database')).rejects.toThrow(
      'Notion answered 401: unauthorized',
    )
  })
})

describe('reading Notion properties', () => {
  it('joins the text of a title or rich text', () => {
    expect(
      plainText({
        type: 'title',
        title: [{ plain_text: 'Las ' }, { plain_text: 'Brisas ' }],
      }),
    ).toBe('Las Brisas')
    expect(
      plainText({ type: 'rich_text', rich_text: [{ plain_text: 'link' }] }),
    ).toBe('link')
    expect(plainText({ type: 'number', number: 1 })).toBe('')
    expect(plainText(undefined)).toBe('')
  })

  it('reads selected options', () => {
    expect(selectedName({ type: 'select', select: { name: 'Light' } })).toBe(
      'Light',
    )
    expect(selectedName({ type: 'select', select: null })).toBeNull()
    expect(selectedName(undefined)).toBeNull()
    expect(
      selectedNames({
        type: 'multi_select',
        multi_select: [{ name: 'Washed' }, { name: 'Natural' }],
      }),
    ).toEqual(['Washed', 'Natural'])
    expect(selectedNames(undefined)).toEqual([])
  })

  it('reads numbers and checkboxes', () => {
    expect(numberOf({ type: 'number', number: 16.5 })).toBe(16.5)
    expect(numberOf(undefined)).toBeNull()
    expect(isChecked({ type: 'checkbox', checkbox: true })).toBe(true)
    expect(isChecked(undefined)).toBe(false)
  })

  it('reads related pages', () => {
    expect(
      relatedIds({ type: 'relation', relation: [{ id: 'a' }, { id: 'b' }] }),
    ).toEqual(['a', 'b'])
    expect(relatedIds(undefined)).toEqual([])
  })

  it('refuses a relation Notion cut short', () => {
    expect(() =>
      relatedIds({ type: 'relation', relation: [], has_more: true }),
    ).toThrow('Notion returned only part of a relation')
  })

  it('reads the first uploaded or linked file', () => {
    expect(
      firstFileUrl({
        type: 'files',
        files: [{ type: 'file', file: { url: 'https://notion/a.webp' } }],
      }),
    ).toBe('https://notion/a.webp')
    expect(
      firstFileUrl({
        type: 'files',
        files: [{ type: 'external', external: { url: 'https://shop/b.jpg' } }],
      }),
    ).toBe('https://shop/b.jpg')
    expect(firstFileUrl({ type: 'files', files: [] })).toBeNull()
  })
})
