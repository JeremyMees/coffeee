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
  <Button
    v-if="pages.hasNextPage.value"
    ref="button"
    type="button"
    variant="outline"
    size="lg"
    class="mx-auto mt-8 flex"
    :disabled="pages.isFetchingNextPage.value"
    @click="loadMore"
  >
    {{ pages.isFetchingNextPage.value ? 'Loading…' : 'Show more' }}
  </Button>
</template>
