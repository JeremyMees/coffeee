<script setup lang="ts">
import { getLocalTimeZone, parseDate, today } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { CalendarIcon, XIcon } from '@lucide/vue'

const model = defineModel<string>({ default: '' })

const props = defineProps<{
  id: string
  label: string
  invalid?: boolean
  clearable?: boolean
}>()

const latest = today(getLocalTimeZone())

const date = computed({
  get: () => (model.value ? parseDate(model.value) : undefined),
  set: (value: DateValue | undefined) => {
    model.value = value ? value.toString() : ''
  },
})
</script>

<template>
  <div class="relative">
    <Popover v-slot="{ close }">
      <PopoverTrigger as-child>
        <Button
          :id="id"
          data-testid="date-picker-trigger"
          variant="outline"
          :class="[
            'w-full justify-start rounded-lg px-2.5 text-left font-normal',
            !date && 'text-muted-foreground',
            clearable && date && 'pr-11 lg:pr-8',
          ]"
          :aria-invalid="invalid ? true : undefined"
        >
          <CalendarIcon aria-hidden="true" />
          {{ model ? formatDate(model) : 'Pick a date' }}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        class="w-auto p-0"
        align="start"
        data-testid="date-picker-calendar"
      >
        <Calendar
          v-model="date"
          :default-placeholder="date ?? latest"
          :max-value="latest"
          :week-starts-on="1"
          layout="month-and-year"
          initial-focus
          @update:model-value="close"
        />
      </PopoverContent>
    </Popover>
    <Button
      v-if="clearable && date"
      type="button"
      data-testid="date-picker-clear"
      variant="ghost"
      size="icon-xs"
      class="absolute top-1/2 right-0 -translate-y-1/2 rounded-full lg:right-1.5"
      :aria-label="`Clear ${props.label.toLowerCase()}`"
      @click="model = ''"
    >
      <XIcon class="size-3.5" aria-hidden="true" />
    </Button>
  </div>
</template>
