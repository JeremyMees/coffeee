import type { Updater } from '@tanstack/vue-table'
import type { Ref } from 'vue'

export { cn } from 'cn'

export function valueUpdater<Value>(updater: Updater<Value>, ref: Ref<Value>) {
  ref.value =
    typeof updater === 'function'
      ? (updater as (old: Value) => Value)(ref.value)
      : updater
}
