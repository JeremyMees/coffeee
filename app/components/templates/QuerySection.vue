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
      <Button
        type="button"
        :data-testid="`${testid}-retry`"
        variant="quiet"
        size="sm"
        class="px-5"
        @click="query.refetch()"
      >
        Try again
      </Button>
    </AlertDescription>
  </Alert>
  <Alert
    v-else-if="query.fetchStatus.value === 'paused'"
    :data-testid="`${testid}-offline`"
  >
    <AlertDescription class="flex flex-col items-start gap-3">
      You're offline. This loads once you're back online.
      <Button
        type="button"
        :data-testid="`${testid}-retry`"
        variant="quiet"
        size="sm"
        class="px-5"
        @click="query.refetch()"
      >
        Try again
      </Button>
    </AlertDescription>
  </Alert>
  <slot v-else name="skeleton" />
</template>
