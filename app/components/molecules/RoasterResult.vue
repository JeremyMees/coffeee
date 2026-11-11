<script setup lang="ts">
const props = defineProps<{ roaster: ListedRoaster }>()

const locale = useLocale()
const morph = useMorph('roaster', () => props.roaster.id)
</script>

<template>
  <NuxtLink
    :to="roasterPath(roaster)"
    data-testid="roaster-result"
    class="flex items-center gap-4 rounded-[18px] border p-3 transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    @click="morph.open"
  >
    <RoasterLogoImage
      :roaster="roaster"
      class="size-16"
      :style="morph.name('logo')"
    />
    <div class="min-w-0 flex-1">
      <h2
        class="w-fit max-w-full truncate font-sans text-lg leading-tight font-semibold tracking-[-0.02em]"
        :style="morph.name('name')"
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
        class="mt-1.5 text-xs uppercase"
        data-testid="roaster-result-bought"
      >
        {{ roaster.shelfCoffees }}
        {{ roaster.shelfCoffees === 1 ? 'coffee' : 'coffees' }} · last bought
        {{ formatDate(roaster.lastBought, locale) }}
      </p>
    </div>
  </NuxtLink>
</template>
