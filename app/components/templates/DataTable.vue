<script setup lang="ts" generic="Row, Value">
import type {
  Column,
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/vue-table'
import { FlexRender, getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const sorting = defineModel<SortingState>('sorting', { required: true })
const pagination = defineModel<PaginationState>('pagination', {
  required: true,
})

const props = defineProps<{
  columns: ColumnDef<Row, Value>[]
  data: Row[]
  rowCount: number
  rowId: (row: Row) => string
  empty: string
}>()

const table = useVueTable({
  get data() {
    return props.data
  },
  get columns() {
    return props.columns
  },
  get rowCount() {
    return props.rowCount
  },
  getRowId: row => props.rowId(row),
  getCoreRowModel: getCoreRowModel(),
  manualSorting: true,
  manualPagination: true,
  enableMultiSort: false,
  sortDescFirst: false,
  state: {
    get sorting() {
      return sorting.value
    },
    get pagination() {
      return pagination.value
    },
  },
  onSortingChange: updater => valueUpdater(updater, sorting),
  onPaginationChange: updater => valueUpdater(updater, pagination),
})

function ariaSort(column: Column<Row>) {
  if (!column.getCanSort()) return undefined

  const sorted = column.getIsSorted()

  if (!sorted) return 'none'

  return sorted === 'asc' ? 'ascending' : 'descending'
}
</script>

<template>
  <div data-testid="data-table">
    <Table class="text-xs">
      <TableHeader>
        <TableRow
          v-for="headerGroup in table.getHeaderGroups()"
          :key="headerGroup.id"
          class="border-primary hover:bg-transparent"
        >
          <TableHead
            v-for="header in headerGroup.headers"
            :key="header.id"
            :aria-sort="ariaSort(header.column)"
            class="px-0 pr-4 text-xs font-normal uppercase"
          >
            <FlexRender
              v-if="!header.isPlaceholder"
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="row in table.getRowModel().rows"
          :key="row.id"
          data-testid="data-table-row"
        >
          <TableCell
            v-for="cell in row.getVisibleCells()"
            :key="cell.id"
            class="px-0 py-3 pr-4"
            :data-testid="`data-table-cell-${cell.column.id}`"
          >
            <FlexRender
              :render="cell.column.columnDef.cell"
              :props="cell.getContext()"
            />
          </TableCell>
        </TableRow>
        <TableRow v-if="!table.getRowModel().rows.length">
          <TableCell
            :colspan="columns.length"
            class="h-24 text-center"
            data-testid="data-table-empty"
          >
            {{ empty }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div
      class="flex items-center justify-end gap-3 py-4 text-xs uppercase"
      data-testid="data-table-pagination"
    >
      <span data-testid="data-table-page">
        Page {{ pagination.pageIndex + 1 }} of
        {{ Math.max(table.getPageCount(), 1) }}
      </span>
      <Button
        variant="outline"
        size="sm"
        data-testid="data-table-previous"
        :disabled="!table.getCanPreviousPage()"
        @click="table.previousPage()"
      >
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        data-testid="data-table-next"
        :disabled="!table.getCanNextPage()"
        @click="table.nextPage()"
      >
        Next
      </Button>
    </div>
  </div>
</template>
