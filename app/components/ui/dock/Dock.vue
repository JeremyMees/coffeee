<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { DataOrientation, Direction } from './types'
import { cn } from 'cn'
import { computed, provide, ref } from 'vue'

import {
  DISTANCE_INJECTION_KEY,
  MAGNIFICATION_INJECTION_KEY,
  MOUSE_X_INJECTION_KEY,
  MOUSE_Y_INJECTION_KEY,
  ORIENTATION_INJECTION_KEY,
} from './injectionKeys'

interface DockProps {
  class?: HTMLAttributes['class']
  magnification?: number
  distance?: number
  direction?: Direction
  orientation?: DataOrientation
}

const props = withDefaults(defineProps<DockProps>(), {
  magnification: 60,
  distance: 140,
  direction: 'middle',
  orientation: 'horizontal',
})

const dockRef = ref<HTMLElement | null>(null)
const mouseX = ref(Infinity)
const mouseY = ref(Infinity)
const magnification = computed(() => props.magnification)
const distance = computed(() => props.distance)

const dockClass = computed(() => ({
  'items-start': props.direction === 'top',
  'items-center': props.direction === 'middle',
  'items-end': props.direction === 'bottom',
}))

function onPointerMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return

  requestAnimationFrame(() => {
    mouseX.value = e.clientX
    mouseY.value = e.clientY
  })
}

function onMouseLeave() {
  requestAnimationFrame(() => {
    mouseX.value = Infinity
    mouseY.value = Infinity
  })
}
provide(MOUSE_X_INJECTION_KEY, mouseX)
provide(MOUSE_Y_INJECTION_KEY, mouseY)
provide(ORIENTATION_INJECTION_KEY, props.orientation)
provide(MAGNIFICATION_INJECTION_KEY, magnification)
provide(DISTANCE_INJECTION_KEY, distance)
</script>

<template>
  <div
    ref="dockRef"
    :class="
      cn(
        `mx-auto mt-8 flex h-14.5 w-max gap-4 rounded-2xl border p-2 backdrop-blur-md transition-all supports-backdrop-blur:bg-white/10`,
        orientation === 'vertical' && 'h-max w-14.5 flex-col',
        props.class,
        dockClass,
      )
    "
    @pointermove="onPointerMove"
    @pointerleave="onMouseLeave"
  >
    <slot />
  </div>
</template>
