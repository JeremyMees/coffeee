import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/vue-table'
import { h } from 'vue'
import DataTable from '~/components/templates/DataTable.vue'
import { tid } from '../../fixtures'

interface Fruit {
  id: string
  name: string
  weight: number
}

const columns: ColumnDef<Fruit, unknown>[] = [
  {
    id: 'name',
    header: 'Name',
    enableSorting: false,
    cell: ({ row }) => row.original.name,
  },
  {
    id: 'weight',
    accessorFn: row => row.weight,
    header: ({ column }) =>
      h(
        'button',
        {
          'data-testid': 'sort-weight',
          onClick: column.getToggleSortingHandler(),
        },
        'Weight',
      ),
    cell: ({ row }) => `${row.original.weight} g`,
  },
]

const fruit: Fruit[] = [
  { id: 'a', name: 'Apple', weight: 180 },
  { id: 'b', name: 'Banana', weight: 120 },
]

async function table(
  options: {
    sorting?: SortingState
    pageIndex?: number
    rowCount?: number
    data?: Fruit[]
  } = {},
) {
  const sortings: SortingState[] = []
  const paginations: PaginationState[] = []
  const wrapper = await mountSuspended(DataTable<Fruit, unknown>, {
    props: {
      columns,
      data: options.data ?? fruit,
      rowCount: options.rowCount ?? 2,
      rowId: (row: Fruit) => row.id,
      empty: 'No fruit',
      sorting: options.sorting ?? [],
      'onUpdate:sorting': (changed: SortingState) => sortings.push(changed),
      pagination: { pageIndex: options.pageIndex ?? 0, pageSize: 2 },
      'onUpdate:pagination': (changed: PaginationState) =>
        paginations.push(changed),
    },
  })

  return { wrapper, sortings, paginations }
}

describe('DataTable', () => {
  it('renders a row per item and a cell per column', async () => {
    const { wrapper } = await table()

    expect(
      wrapper
        .findAll(tid('data-table-row'))
        .map(row => row.findAll('td').map(cell => cell.text())),
    ).toEqual([
      ['Apple', '180 g'],
      ['Banana', '120 g'],
    ])
  })

  it('asks to sort by a column and says how it is sorted', async () => {
    const { wrapper, sortings } = await table({
      sorting: [{ id: 'weight', desc: true }],
    })

    await wrapper.get(tid('sort-weight')).trigger('click')

    expect(sortings).toEqual([[]])
    expect(wrapper.findAll('th').map(th => th.attributes('aria-sort'))).toEqual(
      [undefined, 'descending'],
    )
  })

  it('pages forward and back', async () => {
    const { wrapper, paginations } = await table({
      rowCount: 5,
      pageIndex: 1,
    })

    expect(wrapper.get(tid('data-table-page')).text()).toBe('Page 2 of 3')

    await wrapper.get(tid('data-table-next')).trigger('click')
    await wrapper.get(tid('data-table-previous')).trigger('click')

    expect(paginations).toEqual([
      { pageIndex: 2, pageSize: 2 },
      { pageIndex: 0, pageSize: 2 },
    ])
  })

  it('cannot page past either end', async () => {
    const { wrapper } = await table()

    expect(
      wrapper.get(tid('data-table-previous')).attributes('disabled'),
    ).toBeDefined()
    expect(
      wrapper.get(tid('data-table-next')).attributes('disabled'),
    ).toBeDefined()
  })

  it('says when there is nothing to show', async () => {
    const { wrapper } = await table({ data: [], rowCount: 0 })

    expect(wrapper.get(tid('data-table-empty')).text()).toBe('No fruit')
    expect(wrapper.get(tid('data-table-page')).text()).toBe('Page 1 of 1')
  })
})
