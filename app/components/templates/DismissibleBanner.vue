<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { XIcon } from '@lucide/vue'

const props = defineProps<{
  title: string
  text: string
  storageKey: string
  show: boolean
  testid: string
}>()

const dismissed = useLocalStorage(props.storageKey, false)
const id = useId()
</script>

<template>
  <aside
    v-if="show && !dismissed"
    :data-testid="testid"
    :aria-labelledby="id"
    class="relative mt-4 flex flex-col gap-3 rounded-[18px] border border-primary p-4 pr-14"
  >
    <div>
      <h2 :id="id" class="font-sans font-semibold">{{ title }}</h2>
      <p class="mt-1 text-xs">{{ text }}</p>
    </div>
    <slot />
    <Button
      type="button"
      variant="ghost"
      size="icon"
      :data-testid="`${testid}-dismiss`"
      class="absolute top-1.5 right-1.5"
      aria-label="Dismiss"
      @click="dismissed = true"
    >
      <XIcon aria-hidden="true" />
    </Button>
  </aside>
</template>
