<script setup lang="ts">
defineProps<{ roaster: ListedRoaster }>()
</script>

<template>
  <NuxtLink
    :to="`/roasters/${roaster.id}`"
    data-testid="roaster-result"
    class="flex items-center gap-4 rounded-[18px] border p-3 transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
  >
    <RoasterLogoImage :roaster="roaster" class="size-16" />
    <div class="min-w-0 flex-1">
      <h2
        class="truncate font-sans text-lg leading-tight font-semibold tracking-[-0.02em]"
        data-testid="roaster-result-name"
      >
        {{ roaster.name }}
      </h2>
      <p
        v-if="roasterPlace(roaster)"
        class="mt-0.5 truncate text-xs"
        data-testid="roaster-result-place"
      >
        {{ roasterPlace(roaster) }}
      </p>
      <p
        v-if="roaster.shelfCoffees && roaster.lastBought"
        class="mt-1.5 text-[11px] uppercase"
        data-testid="roaster-result-bought"
      >
        {{ roaster.shelfCoffees }}
        {{ roaster.shelfCoffees === 1 ? 'coffee' : 'coffees' }} · last bought
        {{ formatDate(roaster.lastBought) }}
      </p>
    </div>
  </NuxtLink>
</template>
