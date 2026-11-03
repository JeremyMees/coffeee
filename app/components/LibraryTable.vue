<script setup lang="ts">
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from '@lucide/vue'
import type {
  Column,
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/vue-table'
import type { VNodeChild } from 'vue'
import { NuxtLink, RatingStars } from '#components'

const sorting = defineModel<SortingState>('sorting', { required: true })
const pagination = defineModel<PaginationState>('pagination', {
  required: true,
})

const props = defineProps<{
  coffees: LibraryCoffee[]
  total: number
  shelfId: string
}>()

function sortIcon(column: Column<LibraryCoffee>) {
  const sorted = column.getIsSorted()

  if (sorted === 'asc') return ArrowUpIcon
  if (sorted === 'desc') return ArrowDownIcon

  return ArrowUpDownIcon
}

function sortable(
  id: LibraryColumn,
  cell: (coffee: LibraryCoffee) => VNodeChild,
): ColumnDef<LibraryCoffee, unknown> {
  return {
    id,
    accessorFn: coffee => coffee.id,
    header: ({ column }) =>
      h(
        'button',
        {
          type: 'button',
          'data-testid': `library-sort-${id}`,
          class: 'flex items-center gap-1.5 uppercase hover:underline',
          onClick: column.getToggleSortingHandler(),
        },
        [
          libraryColumnLabels[id],
          h(sortIcon(column), {
            class: ['size-3.5', !column.getIsSorted() && 'opacity-40'],
            'aria-hidden': 'true',
          }),
        ],
      ),
    cell: ({ row }) => cell(row.original),
  }
}

const columns: ColumnDef<LibraryCoffee, unknown>[] = [
  {
    id: 'name',
    enableSorting: false,
    header: 'Coffee',
    cell: ({ row }) =>
      h(
        NuxtLink,
        {
          to: `/shelves/${props.shelfId}/coffees/${row.original.id}`,
          class:
            'flex items-center gap-3 font-sans text-sm font-semibold hover:underline',
          'data-testid': 'library-row-name',
        },
        () => [
          h('span', {
            class: 'size-3 shrink-0 rounded-full',
            style: { backgroundColor: row.original.colour },
            'aria-hidden': 'true',
          }),
          row.original.name,
        ],
      ),
  },
  sortable('rating', coffee =>
    h('span', { class: 'text-primary' }, [
      h(RatingStars, { rating: coffee.rating }),
    ]),
  ),
  sortable('roaster', coffee => coffee.roaster),
  sortable('origin', coffee => originNames(coffee) || 'Unknown'),
  sortable('roastLevel', coffee => roastLevelLabels[coffee.roastLevel]),
  sortable('latestPrice', coffee =>
    coffee.latestPriceCents === null
      ? 'Unknown'
      : formatPrice(coffee.latestPriceCents),
  ),
  sortable('lastBought', coffee => formatDate(coffee.lastBought)),
]
</script>

<template>
  <DataTable
    v-model:sorting="sorting"
    v-model:pagination="pagination"
    :columns="columns"
    :data="coffees"
    :row-count="total"
    :row-id="coffee => coffee.id"
    empty="No coffee in your library matches these filters."
    data-testid="library-table"
  />
</template>
