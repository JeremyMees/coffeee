<script setup lang="ts">
import { ArrowUpRightIcon, PencilIcon } from '@lucide/vue'

const props = defineProps<{ roaster: ShelfRoaster }>()

const morph = useMorph('roaster', () => props.roaster.id)

const editing = ref(false)
</script>

<template>
  <section class="mt-10" data-testid="roaster-details">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h2 class="text-[28px]">Roaster</h2>
      <Button
        v-if="roaster.canEdit"
        type="button"
        data-testid="roaster-edit"
        variant="line"
        size="pill-sm"
        @click="editing = true"
      >
        <PencilIcon class="size-4" aria-hidden="true" />
        Edit roaster
      </Button>
    </div>
    <div class="mt-4 flex items-center gap-4 rounded-[18px] border p-4 text-xs">
      <RoasterLogoImage
        :roaster="roaster"
        class="size-16"
        :style="morph.name('logo')"
      />
      <div class="flex min-w-0 flex-col gap-1">
        <NuxtLink
          :to="roasterPath(roaster)"
          class="hit-area w-fit font-sans text-sm font-semibold underline-offset-4 hover:underline"
          :style="morph.name('name')"
          data-testid="roaster-details-name"
          @click="morph.open"
        >
          {{ roaster.name }}
        </NuxtLink>
        <p v-if="roasterPlace(roaster)" data-testid="roaster-details-place">
          {{ roasterPlace(roaster) }}
        </p>
        <a
          v-if="roaster.website"
          :href="referredLink(roaster.website)"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="roaster-details-website"
          class="hit-area inline-flex items-center gap-1 uppercase underline-offset-4 hover:underline"
        >
          {{ websiteHost(roaster.website) }}
          <ArrowUpRightIcon class="size-4" aria-hidden="true" />
        </a>
      </div>
    </div>
    <EditRoasterSheet
      v-if="roaster.canEdit"
      v-model:open="editing"
      :roaster="roaster"
    />
  </section>
</template>
