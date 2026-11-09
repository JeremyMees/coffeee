<script setup lang="ts" generic="Data">
const props = defineProps<{ query: QueryState<Data>; testid: string }>()

const hydrated = useHydrated()
const rendersWithData = props.query.data.value !== undefined
const ready = computed(() => hydrated.value || rendersWithData)
</script>

<template>
  <slot
    v-if="ready && query.data.value !== undefined"
    :data="query.data.value"
  />
  <Alert
    v-else-if="query.isError.value"
    variant="destructive"
    :data-testid="`${testid}-error`"
  >
    <AlertDescription class="flex flex-col items-start gap-3">
      Something went wrong while loading this.
      <button
        type="button"
        :data-testid="`${testid}-retry`"
        class="rounded-full border border-current px-5 py-2 text-xs uppercase"
        @click="query.refetch()"
      >
        Try again
      </button>
    </AlertDescription>
  </Alert>
  <Alert
    v-else-if="query.fetchStatus.value === 'paused'"
    :data-testid="`${testid}-offline`"
  >
    <AlertDescription class="flex flex-col items-start gap-3">
      You're offline. This loads once you're back online.
      <button
        type="button"
        :data-testid="`${testid}-retry`"
        class="rounded-full border border-current px-5 py-2 text-xs uppercase"
        @click="query.refetch()"
      >
        Try again
      </button>
    </AlertDescription>
  </Alert>
  <slot v-else name="skeleton" />
</template>
