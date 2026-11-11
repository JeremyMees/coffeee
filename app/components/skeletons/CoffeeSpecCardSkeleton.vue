<script setup lang="ts">
withDefaults(defineProps<{ rows?: number; roaster?: boolean }>(), {
  rows: 4,
  roaster: true,
})
</script>

<template>
  <div
    class="flex h-full flex-col gap-2.5 rounded-[18px] border border-primary px-3.5 py-3"
    data-testid="coffee-spec-card-skeleton"
  >
    <div class="flex items-center gap-3">
      <Skeleton class="size-13 shrink-0 rounded-[10px]" />
      <div class="flex flex-1 flex-col gap-2">
        <Skeleton
          v-if="roaster"
          class="h-3 w-20"
          data-testid="coffee-spec-card-skeleton-roaster"
        />
        <Skeleton class="h-5 w-3/4" />
      </div>
    </div>
    <div class="mt-auto flex flex-col gap-2 border-t border-primary pt-2.5">
      <Skeleton
        v-for="row in rows"
        :key="row"
        class="h-3 w-full"
        data-testid="coffee-spec-card-skeleton-row"
      />
    </div>
  </div>
</template>
