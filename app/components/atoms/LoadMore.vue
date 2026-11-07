<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import type { Ref } from 'vue'

const props = defineProps<{
  pages: {
    hasNextPage: Ref<boolean>
    isFetchingNextPage: Ref<boolean>
    fetchNextPage: () => unknown
  }
}>()

const button = useTemplateRef<HTMLElement>('button')

function loadMore() {
  if (props.pages.hasNextPage.value && !props.pages.isFetchingNextPage.value) {
    props.pages.fetchNextPage()
  }
}

useIntersectionObserver(button, ([entry]) => {
  if (entry?.isIntersecting) loadMore()
})
</script>

<template>
  <button
    v-if="pages.hasNextPage.value"
    ref="button"
    type="button"
    class="mx-auto mt-8 flex rounded-full border border-primary px-6 py-2.5 text-sm uppercase"
    :disabled="pages.isFetchingNextPage.value"
    @click="loadMore"
  >
    {{ pages.isFetchingNextPage.value ? 'Loading…' : 'Show more' }}
  </button>
</template>
