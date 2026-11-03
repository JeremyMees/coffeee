<script setup lang="ts">
import { ArrowUpRightIcon, PencilIcon } from '@lucide/vue'

defineProps<{ shelfId: string; roaster: ShelfRoaster }>()

const editing = ref(false)
</script>

<template>
  <section class="mt-10" data-testid="roaster-details">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h2 class="text-[28px]">Roaster</h2>
      <button
        v-if="roaster.canEdit"
        type="button"
        data-testid="roaster-edit"
        class="flex shrink-0 items-center gap-2 rounded-full border border-primary px-4 py-2 text-xs uppercase transition-colors hover:bg-primary hover:text-primary-foreground"
        @click="editing = true"
      >
        <PencilIcon class="size-4" aria-hidden="true" />
        Edit roaster
      </button>
    </div>
    <div class="mt-4 flex items-center gap-4 rounded-[18px] border p-4 text-xs">
      <RoasterLogoImage :roaster="roaster" class="size-16" />
      <div class="flex min-w-0 flex-col gap-1">
        <NuxtLink
          :to="`/roasters/${roaster.id}`"
          class="font-sans text-sm font-semibold underline-offset-4 hover:underline"
          data-testid="roaster-details-name"
        >
          {{ roaster.name }}
        </NuxtLink>
        <p v-if="roasterPlace(roaster)" data-testid="roaster-details-place">
          {{ roasterPlace(roaster) }}
        </p>
        <a
          v-if="roaster.website"
          :href="roaster.website"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="roaster-details-website"
          class="inline-flex items-center gap-1 uppercase underline-offset-4 hover:underline"
        >
          {{ websiteHost(roaster.website) }}
          <ArrowUpRightIcon class="size-4" aria-hidden="true" />
        </a>
      </div>
    </div>
    <EditRoasterSheet
      v-if="roaster.canEdit"
      v-model:open="editing"
      :shelf-id="shelfId"
      :roaster="roaster"
    />
  </section>
</template>
