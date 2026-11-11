<script setup lang="ts">
import { ImageIcon } from '@lucide/vue'
import { NuxtLink } from '#components'

const props = withDefaults(
  defineProps<{
    coffee: SpecCardCoffee
    testid: string
    to?: string
    hideRoaster?: boolean
  }>(),
  { to: undefined },
)

const morph = useMorph('coffee', () => props.coffee.id)

const roast = computed(
  () =>
    `${roastLevelLabels[props.coffee.roastLevel]} · ${roastedForLabels[props.coffee.roastedFor]}`,
)
</script>

<template>
  <component
    :is="to ? NuxtLink : 'article'"
    :to="to"
    :data-testid="testid"
    class="flex h-full flex-col gap-2.5 rounded-[18px] border border-primary bg-background px-3.5 py-3 text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    @click="morph.open"
  >
    <div class="flex items-center gap-3">
      <div
        class="grid size-13 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-accent"
        :style="morph.name('photo')"
        :data-testid="`${testid}-photo-frame`"
      >
        <NuxtImg
          v-if="coffee.photoUrl"
          :src="coffee.photoUrl"
          alt=""
          sizes="52px"
          loading="lazy"
          class="size-full object-cover"
          :data-testid="`${testid}-photo`"
        />
        <ImageIcon
          v-else
          class="size-5 opacity-60"
          aria-hidden="true"
          :data-testid="`${testid}-placeholder`"
        />
      </div>
      <div class="min-w-0 flex-1">
        <p
          v-if="!hideRoaster"
          class="truncate text-[11px] uppercase"
          :data-testid="`${testid}-roaster`"
        >
          {{ coffee.roaster }}
        </p>
        <h2
          :data-testid="`${testid}-name`"
          :style="morph.name('name')"
          :class="[
            'mb-[-0.1em] w-fit py-[0.1em] font-sans text-[19px] leading-[1.05] font-semibold tracking-[-0.03em]',
            !hideRoaster && 'mt-[calc(--spacing(0.75)-0.1em)]',
          ]"
        >
          {{ coffee.name }}
        </h2>
      </div>
      <slot name="badge" />
    </div>
    <LazyMatchedBy
      v-if="coffee.matches"
      :matches="coffee.matches"
      :testid="testid"
    />
    <dl
      class="mt-auto flex flex-col gap-1.5 border-t border-primary pt-2.5 text-[11px] uppercase"
    >
      <SpecRow label="Roast">
        <dd class="max-w-[68%] text-right" :data-testid="`${testid}-roast`">
          {{ roast }}
        </dd>
      </SpecRow>
      <slot name="facts" />
      <SpecRow v-if="coffee.flavorNotes.length" label="Notes">
        <dd class="max-w-[68%] text-right">
          <ul class="inline" :data-testid="`${testid}-flavor-notes`">
            <li
              v-for="note in coffee.flavorNotes"
              :key="note.id"
              :data-testid="`${testid}-flavor-note`"
              class="inline after:content-[',_'] last:after:content-none"
            >
              {{ note.name }}
            </li>
          </ul>
        </dd>
      </SpecRow>
      <slot name="ratings" />
    </dl>
  </component>
</template>
