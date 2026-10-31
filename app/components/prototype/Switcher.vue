<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'

const props = defineProps<{
  variants: { key: string; name: string }[]
}>()

const dev = import.meta.dev
const route = useRoute()
const router = useRouter()

const index = computed(() => {
  const found = props.variants.findIndex(v => v.key === route.query.variant)

  return found === -1 ? 0 : found
})

const current = computed(() => props.variants[index.value]!)

function go(step: number) {
  const next =
    props.variants[
      (index.value + step + props.variants.length) % props.variants.length
    ]!
  router.replace({ query: { ...route.query, variant: next.key } })
}

function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable]')) return
  if (event.key === 'ArrowLeft') go(-1)
  if (event.key === 'ArrowRight') go(1)
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    v-if="dev"
    class="fixed top-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/85 p-1 font-sans text-sm text-white shadow-lg ring-1 ring-white/20 backdrop-blur"
  >
    <button
      type="button"
      class="grid size-8 place-items-center rounded-full hover:bg-white/15"
      aria-label="Previous variant"
      @click="go(-1)"
    >
      <ChevronLeftIcon class="size-4" />
    </button>
    <span class="min-w-36 px-2 text-center tabular-nums">
      {{ current.key }} · {{ current.name }}
    </span>
    <button
      type="button"
      class="grid size-8 place-items-center rounded-full hover:bg-white/15"
      aria-label="Next variant"
      @click="go(1)"
    >
      <ChevronRightIcon class="size-4" />
    </button>
  </div>
</template>
