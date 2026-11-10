<script setup lang="ts">
import { XIcon } from '@lucide/vue'
import { useMediaQuery, usePointerSwipe } from '@vueuse/core'
import { DialogClose } from 'reka-ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

defineOptions({ inheritAttrs: false })

defineProps<{ title: string; description: string }>()

const open = defineModel<boolean>('open', { default: false })
const desktop = useMediaQuery('(min-width: 1024px)')

const parts = computed(() =>
  desktop.value
    ? {
        root: Dialog,
        content: DialogContent,
        header: DialogHeader,
        title: DialogTitle,
        description: DialogDescription,
      }
    : {
        root: Sheet,
        content: SheetContent,
        header: SheetHeader,
        title: SheetTitle,
        description: SheetDescription,
      },
)

const dismissDistance = 100
const handle = useTemplateRef<HTMLElement>('handle')
const dragged = ref(0)

const { distanceY } = usePointerSwipe(handle, {
  threshold: 0,
  disableTextSelect: true,
  onSwipe() {
    dragged.value = Math.max(0, -distanceY.value)
  },
  onSwipeEnd() {
    if (dragged.value > dismissDistance) open.value = false
    dragged.value = 0
  },
})

const dragStyle = computed(() =>
  dragged.value
    ? { transform: `translateY(${dragged.value}px)`, transition: 'none' }
    : undefined,
)
</script>

<template>
  <component :is="parts.root" v-model:open="open">
    <component
      :is="parts.content"
      v-bind="$attrs"
      :side="desktop ? undefined : 'bottom'"
      :show-close-button="false"
      :style="desktop ? undefined : dragStyle"
      :class="
        desktop
          ? 'flex max-h-[88dvh] flex-col gap-0 overflow-hidden rounded-[28px] border border-primary bg-background p-0 font-mono ring-0 sm:max-w-2xl'
          : 'max-h-[92dvh] gap-0 overflow-hidden rounded-t-[28px] border-primary bg-background font-mono'
      "
    >
      <div
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
        data-testid="form-sheet-scroller"
      >
        <div
          ref="handle"
          :class="desktop ? undefined : 'touch-none'"
          data-testid="form-sheet-handle"
        >
          <div
            v-if="!desktop"
            class="mx-auto mt-3 h-1.5 w-12 rounded-full bg-primary/30"
            aria-hidden="true"
          />
          <component
            :is="parts.header"
            class="gap-1.5 px-5 pt-6 text-left lg:px-8 lg:pt-10"
          >
            <component
              :is="parts.title"
              data-testid="form-sheet-title"
              class="font-sans text-[40px] leading-[0.9] font-semibold tracking-[-0.045em] text-primary"
            >
              {{ title }}
            </component>
            <component
              :is="parts.description"
              data-testid="form-sheet-description"
              class="text-xs text-primary"
            >
              {{ description }}
            </component>
          </component>
        </div>

        <Suspense>
          <div>
            <slot />
          </div>
          <template #fallback>
            <div
              aria-hidden="true"
              class="flex flex-col gap-6 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8"
              data-testid="form-sheet-skeleton"
            >
              <div v-for="field in 3" :key="field" class="flex flex-col gap-2">
                <div class="h-4 w-24 animate-pulse rounded-md bg-muted" />
                <div class="h-8 w-full animate-pulse rounded-lg bg-muted" />
              </div>
              <div class="h-11 w-full animate-pulse rounded-full bg-muted" />
            </div>
          </template>
        </Suspense>
      </div>

      <DialogClose
        data-testid="form-sheet-close"
        class="absolute top-4 right-4 rounded-full p-2 text-primary transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <XIcon class="size-4" aria-hidden="true" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </component>
  </component>
</template>
