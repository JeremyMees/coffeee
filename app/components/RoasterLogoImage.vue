<script setup lang="ts">
defineProps<{ roaster: Pick<ShelfRoaster, 'name' | 'logoUrl'> }>()
</script>

<template>
  <div
    class="grid shrink-0 place-items-center overflow-hidden rounded-full border bg-background"
    data-testid="roaster-logo"
  >
    <NuxtImg
      v-if="roaster.logoUrl"
      :src="roaster.logoUrl"
      :alt="`The logo of ${roaster.name}`"
      sizes="128px"
      class="size-full object-contain"
      data-testid="roaster-logo-image"
    />
    <span
      v-else
      class="font-sans text-xl font-semibold uppercase"
      aria-hidden="true"
      data-testid="roaster-logo-placeholder"
    >
      {{ roaster.name.charAt(0) }}
    </span>
  </div>
</template>
